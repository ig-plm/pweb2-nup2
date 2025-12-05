import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import bd from "./src/models/index.js";
import redisClient from "./src/config/redis.js";
import supabase from "./src/config/supabase.js";
import authMiddleware from "./src/middleware/auth.js";

const { Task, User } = bd;
const app = express();
const port = 3000;

// Configuração do Multer para upload de arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.json());
app.use(cors());

// --- Autenticação ---

// Signin
app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, profile_picture: user.profile_picture } });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Signup (Auxiliar)
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json(user);
  } catch (error) {
    console.error("Erro no cadastro:", error);
    res.status(400).json({ error: "Erro ao criar usuário" });
  }
});

// Profile (Protegido + Upload)
app.put("/profile", authMiddleware, upload.single("profile_picture"), async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const { name } = req.body;
    if (name) user.name = name;

    if (req.file) {
      const file = req.file;
      const fileName = `avatar_${user.id}_${Date.now()}`;

      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      user.profile_picture = publicUrlData.publicUrl;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
});

// --- Tasks (com Redis) ---

app.get("/tasks", async (req, res) => {
  const cacheKey = "tasks:all";

  try {
    const cachedTasks = await redisClient.get(cacheKey);

    if (cachedTasks) {
      return res.json({
        cache: "cache-hit",
        data: JSON.parse(cachedTasks)
      });
    }

    const tasks = await Task.findAll();

    // Cache por 1 hora (3600s)
    await redisClient.setex(cacheKey, 3600, JSON.stringify(tasks));

    res.json({
      cache: "cache-miss",
      data: tasks
    });

  } catch (error) {
    console.error("Erro ao buscar tasks:", error);
    // Fallback para banco se Redis falhar
    try {
      const tasks = await Task.findAll();
      res.json({ cache: "error", data: tasks });
    } catch (dbError) {
      res.status(500).json({ error: "Erro ao buscar tasks" });
    }
  }
});

app.post("/tasks", async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: "Descrição obrigatória" });

  try {
    const task = await Task.create({ description, completed: false });

    // Invalida o cache
    await redisClient.del("tasks:all");

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar tarefa" });
  }
});

app.put("/tasks/:id", async (req, res) => {
  const { description, completed } = req.body;
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });

    await task.update({ description, completed });

    // Invalida o cache geral e específico (se houver)
    await redisClient.del("tasks:all");
    await redisClient.del(`tasks:${req.params.id}`);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar tarefa" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const deleted = await Task.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: "Tarefa não encontrada" });

    // Invalida o cache
    await redisClient.del("tasks:all");
    await redisClient.del(`tasks:${req.params.id}`);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erro ao deletar tarefa" });
  }
});

// --- Inicialização ---

app.listen(port, '0.0.0.0', async () => {
  console.log(`Server is running on port ${port}`);

  try {
    await bd.sequelize.authenticate();
    console.log("Conexão com o banco de dados estabelecida.");
  } catch (error) {
    console.error("Aviso: Não foi possível conectar ao banco de dados na inicialização:", error.message);
  }
});