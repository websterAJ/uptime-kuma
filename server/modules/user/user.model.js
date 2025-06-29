// Modelo de usuario para Uptime Kuma
const { R } = require("redbean-node");
const Database = require("../../database");

async function ensureDBConnected() {
    if (!R.knex) {
        await Database.connect();
    }
}

class User {
    static async create({ username, passwordHash, email }) {
        await ensureDBConnected();
        const user = R.dispense("user");
        user.username = username;
        user.password = passwordHash;
        user.email = email;
        user.active = true;
        user.created_date = new Date();
        const id = await R.store(user);
        return { id, username, email };
    }

    static async findByUsername(username) {
        await ensureDBConnected();
        const user = await R.findOne("user", "username = ?", [username]);
        return user ? user : null;
    }

    static async findById(id) {
        await ensureDBConnected();
        const user = await R.findOne("user", "id = ?", [id]);
        return user ? user : null;
    }

    static async update(id, data) {
        await ensureDBConnected();
        const user = await R.findOne("user", "id = ?", [id]);
        if (!user) return null;
        if (data.username !== undefined) user.username = data.username;
        if (data.passwordHash !== undefined) user.password = data.passwordHash;
        if (data.email !== undefined) user.email = data.email;
        if (data.active !== undefined) user.active = data.active;
        await R.store(user);
        return user;
    }

    static async delete(id) {
        await ensureDBConnected();
        const user = await R.findOne("user", "id = ?", [id]);
        if (!user) return false;
        await R.trash(user);
        return true;
    }

    static async getAll() {
        await ensureDBConnected();
        const users = await R.findAll("user");
        return users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            active: u.active
        }));
    }
}

module.exports = User;
