const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// 模拟接口：随机延迟 100~800ms
app.get('/api/item/:id', (req, res) => {
  const id = req.params.id;
  const delay = Math.floor(Math.random() * 700) + 100;

  setTimeout(() => {
    res.json({ id, data: `item ${id} 的数据`, delay });
  }, delay);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务已启动：http://localhost:${PORT}`);
});
