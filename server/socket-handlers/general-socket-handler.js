const { log } = require("../../src/util");
const { Settings } = require("../settings");
const { sendInfo } = require("../client");
const { checkLogin, isAdmin } = require("../util-server");
const { R } = require("redbean-node");
const passwordHash = require("../password-hash"); // Added passwordHash
const GameResolver = require("gamedig/lib/GameResolver");
const { testChrome } = require("../monitor-types/real-browser-monitor-type");
const fsAsync = require("fs").promises;
const path = require("path");

let gameResolver = new GameResolver();
let gameList = null;

/**
 * Get a game list via GameDig
 * @returns {object[]} list of games supported by GameDig
 */
function getGameList() {
    if (gameList == null) {
        gameList = gameResolver._readGames().games.sort((a, b) => {
            if ( a.pretty < b.pretty ) {
                return -1;
            }
            if ( a.pretty > b.pretty ) {
                return 1;
            }
            return 0;
        });
    }
    return gameList;
}

/**
 * Handler for general events
 * @param {Socket} socket Socket.io instance
 * @param {UptimeKumaServer} server Uptime Kuma server
 * @returns {void}
 */
module.exports.generalSocketHandler = (socket, server) => {
    socket.on("initServerTimezone", async (timezone) => {
        try {
            checkLogin(socket);
            log.debug("generalSocketHandler", "Timezone: " + timezone);
            await Settings.set("initServerTimezone", true);
            await server.setTimezone(timezone);
            await sendInfo(socket);
        } catch (e) {
            log.warn("initServerTimezone", e.message);
        }
    });

    socket.on("getGameList", async (callback) => {
        try {
            checkLogin(socket);
            callback({
                ok: true,
                gameList: getGameList(),
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("createUser", async (userData, callback) => {
        try {
            checkLogin(socket);
            await isAdmin(socket); // Only admins can create users

            const { username, password, userType } = userData;

            // Validate input
            if (!username || username.trim() === "") {
                throw new Error("Username is required.");
            }
            if (username.includes(" ")) {
                throw new Error("Username cannot contain spaces.");
            }
            if (!password) {
                throw new Error("Password is required.");
            }
            // Add more password complexity rules if needed, e.g., length
            if (password.length < 6) {
                throw new Error("Password must be at least 6 characters long.");
            }

            const allowedTypes = [ "admin", "editor", "viewer" ];
            if (!userType || !allowedTypes.includes(userType)) {
                throw new Error(`Invalid user type. Allowed types are: ${allowedTypes.join(", ")}`);
            }

            // Check if username already exists
            const existingUser = await R.findOne("user", "username = ?", [ username.trim() ]);
            if (existingUser) {
                return callback({
                    ok: false,
                    msg: "Username already exists.",
                    fieldErrors: { username: "Username already exists." }
                });
            }

            // Hash password
            const hashedPassword = await passwordHash.generate(password);

            // Create new user
            const user = R.dispense("user");
            user.username = username.trim();
            user.password = hashedPassword;
            user.user_type = userType; // Usar siempre user_type para la base de datos
            user.active = true; // Or handle activation differently if needed
            // user.createdDate = R.isoDateTime(); // If you have such a field
            const response = await R.store(user);
            console.log(response);
            log.info("createUser", `Admin (ID: ${socket.userID}) created new user (Username: ${user.username}, Type: ${user.user_type})`);

            callback({
                ok: true,
                msg: "User created successfully.",
            });

        } catch (e) {
            log.error("createUser", `Error creating user by admin (ID: ${socket.userID}): ${e.message}`);
            // Distinguish between general errors and specific field errors if possible
            if (e.message.toLowerCase().includes("username")) {
                return callback({
                    ok: false,
                    msg: e.message,
                    fieldErrors: {
                        username: e.message
                    }
                });
            }
            if (e.message.toLowerCase().includes("password")) {
                return callback({
                    ok: false,
                    msg: e.message,
                    fieldErrors: {
                        password: e.message
                    }
                });
            }
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("testChrome", (executable, callback) => {
        try {
            checkLogin(socket);
            // Just noticed that await call could block the whole socket.io server!!! Use pure promise instead.
            testChrome(executable).then((version) => {
                callback({
                    ok: true,
                    msg: {
                        key: "foundChromiumVersion",
                        values: [ version ],
                    },
                    msgi18n: true,
                });
            }).catch((e) => {
                callback({
                    ok: false,
                    msg: e.message,
                });
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("getPushExample", async (language, callback) => {
        try {
            checkLogin(socket);
            if (!/^[a-z-]+$/.test(language)) {
                throw new Error("Invalid language");
            }
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
            return;
        }

        try {
            let dir = path.join("./extra/push-examples", language);
            let files = await fsAsync.readdir(dir);

            for (let file of files) {
                if (file.startsWith("index.")) {
                    callback({
                        ok: true,
                        code: await fsAsync.readFile(path.join(dir, file), "utf8"),
                    });
                    return;
                }
            }
        } catch (e) {

        }

        callback({
            ok: false,
            msg: "Not found",
        });
    });

    // Disconnect all other socket clients of the user
    socket.on("disconnectOtherSocketClients", async () => {
        try {
            checkLogin(socket);
            server.disconnectAllSocketClients(socket.userID, socket.id);
        } catch (e) {
            log.warn("disconnectAllSocketClients", e.message);
        }
    });

    // User Management Socket Handlers
    // Only admins should be able to manage users.

    socket.on("deleteUser", async (userID, callback) => {
        try {
            checkLogin(socket);
            await isAdmin(socket); // Ensure the user is an admin

            // No permitir que un usuario se elimine a sí mismo
            if (userID === socket.userID) {
                return callback({
                    ok: false,
                    msg: "You cannot delete your own user."
                });
            }

            const user = await R.findOne("user", "id = ?", [ userID ]);
            if (!user) {
                return callback({
                    ok: false,
                    msg: "User not found."
                });
            }

            await R.trash(user);
            log.info("deleteUser", `Admin (ID: ${socket.userID}) deleted user (ID: ${userID}, Username: ${user.username})`);
            callback({
                ok: true,
                msg: "User deleted successfully."
            });
        } catch (e) {
            log.error("deleteUser", e.message);
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("getUsers", async (callback) => {
        try {
            checkLogin(socket);
            await isAdmin(socket); // Ensure the user is an admin

            const userList = await R.findAll("user", "ORDER BY username");
            // Avoid sending password hashes to the client
            const sanitizedUserList = userList.map(user => {
                const { password, ...sanitizedUser } = user.export();
                return sanitizedUser;
            });

            callback({
                ok: true,
                users: sanitizedUserList,
            });
        } catch (e) {
            log.error("getUsers", e.message);
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("updateUserType", async (userID, newUserType, callback) => {
        try {
            checkLogin(socket);
            await isAdmin(socket); // Ensure the user is an admin

            if (!userID || !newUserType) {
                throw new Error("User ID and new user type are required.");
            }

            // Prevent admin from changing their own type if they are the only admin?
            // Or prevent changing the type of the main admin user? (e.g., user with ID 1)
            // For now, let's assume such checks are handled by higher-level logic or are not required.

            const user = await R.findOne("user", "id = ?", [ userID ]);
            if (!user) {
                throw new Error("User not found.");
            }

            // Potentially validate newUserType against a list of allowed types
            const allowedTypes = [ "admin", "editor", "viewer" ]; // Example types
            if (!allowedTypes.includes(newUserType)) {
                throw new Error(`Invalid user type: ${newUserType}. Allowed types are: ${allowedTypes.join(", ")}`);
            }

            user.userType = newUserType;
            await R.store(user);

            // Optionally, emit an event to other admins that a user type has changed
            // server.sendToAdmins("userTypeChanged", { userID, newUserType });

            callback({
                ok: true,
                msg: `User type for user ID ${userID} updated to ${newUserType}.`,
            });

        } catch (e) {
            log.error("updateUserType", e.message);
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

};
