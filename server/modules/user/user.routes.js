// Rutas de usuario para Uptime Kuma
const express = require("express");
const router = express.Router();
const userController = require("./user.controller");

router.post("/", userController.createUser);
router.get("/:id", userController.getUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.get("/", async (req, res) => {
    try {
        const users = await require("./user.model").getAll();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
