// Controlador de usuario para Uptime Kuma
const User = require("./user.model");
const passwordHash = require("../../password-hash");

const userController = {
    async createUser(req, res) {
        try {
            const { username, password, email } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: "Username and password are required." });
            }
            // Encriptar la contraseña antes de guardar
            const passwordHashValue = await passwordHash.generate(password);
            const user = await User.create({ username, passwordHash: passwordHashValue, email });
            res.status(201).json(user);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getUser(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);
            if (!user) return res.status(404).json({ error: "User not found" });
            res.json(user);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            if (data.password) {
                // Encriptar la nueva contraseña antes de guardar
                data.passwordHash = await passwordHash.generate(data.password);
                delete data.password;
            }
            const user = await User.update(id, data);
            if (!user) return res.status(404).json({ error: "User not found" });
            res.json(user);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const deleted = await User.delete(id);
            if (!deleted) return res.status(404).json({ error: "User not found" });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};

module.exports = userController;
