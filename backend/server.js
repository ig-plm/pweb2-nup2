import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bd from "./src/models/index.js";
import redisClient from "./src/config/redis.js";

dotenv.config();

const { Task } = bd;

// Testa a conexão com o banco de dados
try {
  await bd.sequelize.authenticate();
  console.log("Conexão com o banco de dados estabelecida com sucesso.");
} catch (error) {
  console.error("Erro ao conectar ao banco de dados:", error);
  process.exit(1);
}

// Testa a conexão com o Redis
try {
  await redisClient.ping();
  console.log("Conexão com o Redis estabelecida com sucesso.");
} catch (error) {
  console.error("Erro ao conectar ao Redis:", error);
  // Não encerra o servidor se o Redis falhar, apenas loga o erro
}

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});

app.get("/tasks", async (req, res) => {
  try {
    // Tenta buscar do cache primeiro
    const cacheKey = "tasks:all";
    const cachedTasks = await redisClient.get(cacheKey);
    
    if (cachedTasks) {
      console.log("Retornando tasks do cache");
      return res.json(JSON.parse(cachedTasks));
    }
    
    // Se não estiver no cache, busca do banco
    const tasks = await Task.findAll();
    const tasksJson = tasks.map(task => task.toJSON());
    
    // Armazena no cache por 60 segundos
    await redisClient.setex(cacheKey, 60, JSON.stringify(tasksJson));
    
    res.json(tasks);
  } catch (error) {
    console.error("Erro ao buscar tasks:", error);
    // Em caso de erro no Redis, busca direto do banco
    const tasks = await Task.findAll();
    res.json(tasks);
  }
});

app.post("/tasks", async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: "Descrição obrigatória" });
  const task = await Task.create({ description, completed: false });
  
  // Invalida o cache de tasks
  try {
    await redisClient.del("tasks:all");
  } catch (error) {
    console.error("Erro ao invalidar cache:", error);
  }
  
  res.status(201).json(task);
});

app.get("/tasks/:id", async (req, res) => {
  try {
    const cacheKey = `tasks:${req.params.id}`;
    const cachedTask = await redisClient.get(cacheKey);
    
    if (cachedTask) {
      console.log(`Retornando task ${req.params.id} do cache`);
      return res.json(JSON.parse(cachedTask));
    }
    
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    
    // Armazena no cache por 60 segundos
    await redisClient.setex(cacheKey, 60, JSON.stringify(task.toJSON()));
    
    res.json(task);
  } catch (error) {
    console.error("Erro ao buscar task:", error);
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json(task);
  }
});

app.put("/tasks/:id", async (req, res) => {
  const { description, completed } = req.body;
  const task = await Task.findByPk(req.params.id);
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
  await task.update({ description, completed });
  
  // Invalida o cache
  try {
    await redisClient.del(`tasks:${req.params.id}`);
    await redisClient.del("tasks:all");
  } catch (error) {
    console.error("Erro ao invalidar cache:", error);
  }
  
  res.json(task);
});

app.delete("/tasks/:id", async (req, res) => {
  const deleted = await Task.destroy({ where: { id: req.params.id } });
  if (!deleted) return res.status(404).json({ error: "Tarefa não encontrada" });
  
  // Invalida o cache
  try {
    await redisClient.del(`tasks:${req.params.id}`);
    await redisClient.del("tasks:all");
  } catch (error) {
    console.error("Erro ao invalidar cache:", error);
  }
  
  res.status(204).send();
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Database is running on port ${process.env.DB_PORT}`);
});