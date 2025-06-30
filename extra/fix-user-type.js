// Script para revisar y corregir el campo user_type en la base de datos
const { R } = require("redbean-node");
const Database = require("../server/database");

(async () => {
    await Database.connect();
    const users = await R.findAll("user");
    for (const user of Object.values(users)) {
        if (!user.user_type || !["admin", "editor", "viewer"].includes(user.user_type)) {
            // Por defecto, asignar "viewer" si no está definido o es inválido
            user.user_type = "viewer";
            await R.store(user);
            console.log(`Corregido usuario ${user.username} (ID: ${user.id}) a user_type: viewer`);
        } else {
            console.log(`Usuario ${user.username} (ID: ${user.id}) tiene user_type: ${user.user_type}`);
        }
    }
    process.exit(0);
})();
