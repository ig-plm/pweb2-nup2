import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bd from "./src/models/index.js";
import redisClient from "./src/config/redis.js";
import cacheStats from "./src/utils/cacheStats.js";
import memoryCache from "./src/utils/memoryCache.js";

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

// Endpoint para visualizar estatísticas de cache
app.get("/cache/stats", (req, res) => {
  const stats = cacheStats.getStats();
  res.json({
    message: "Estatísticas de Cache",
    stats: {
      hits: stats.hits,
      misses: stats.misses,
      errors: stats.errors,
      total: stats.total,
      hitRate: `${stats.hitRate.toFixed(2)}%`,
      missRate: `${stats.missRate.toFixed(2)}%`
    },
    description: {
      hits: "Número de requisições que retornaram dados do cache (Cache Hit)",
      misses: "Número de requisições que buscaram dados do banco (Cache Miss)",
      errors: "Número de erros ao acessar o cache",
      total: "Total de requisições processadas",
      hitRate: "Percentual de Cache Hit (eficiência do cache)",
      missRate: "Percentual de Cache Miss"
    }
  });
});

// Endpoint para resetar estatísticas de cache
app.post("/cache/stats/reset", (req, res) => {
  cacheStats.reset();
  res.json({ message: "Estatísticas de cache resetadas com sucesso" });
});

app.get("/tasks", async (req, res) => {
  const cacheKey = "tasks:all";
  
  try {
    // Verifica se o cache existe
    const cachedTasks = memoryCache.get(cacheKey);
    
    if (cachedTasks !== null) {
      // Cache Hit: dados encontrados no cache
      return res.json({
        cache: "cache-hit",
        data: cachedTasks
      });
    }
    
    // Cache Miss: dados não encontrados, busca do banco
    const tasks = await Task.findAll();
    const tasksJson = tasks.map(task => task.toJSON());
    
    // Salva no cache em memória
    memoryCache.set(cacheKey, tasksJson);
    
    // Retorna com indicador de cache-miss
    res.json({
      cache: "cache-miss",
      data: tasks
    });
    
  } catch (error) {
    console.error("Erro ao buscar tasks:", error);
    res.status(500).json({ error: "Erro ao buscar tasks" });
  }
});

app.post("/tasks", async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: "Descrição obrigatória" });
  const task = await Task.create({ description, completed: false });
  
  // Invalida o cache (define como null)
  memoryCache.invalidate("tasks:all");
  
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
  
  // Invalida o cache (define como null)
  memoryCache.invalidate("tasks:all");
  
  res.json(task);
});

app.delete("/tasks/:id", async (req, res) => {
  const deleted = await Task.destroy({ where: { id: req.params.id } });
  if (!deleted) return res.status(404).json({ error: "Tarefa não encontrada" });
  
  // Invalida o cache (define como null)
  memoryCache.invalidate("tasks:all");
  
  res.status(204).send();
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Database is running on port ${process.env.DB_PORT}`);
});