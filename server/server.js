import express from "express";

const app = express();

const PORT = 5454;

app.get("/", (req, res) => {
  res.send("server is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`server is starting on port ${PORT}`);
});