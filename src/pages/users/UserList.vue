<template>
    <div>
        <h1>Usuarios</h1>
        <router-link to="/users/create" class="btn btn-primary">Crear Usuario</router-link>
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="user in users" :key="user.id">
                    <td>{{ user.id }}</td>
                    <td>{{ user.username }}</td>
                    <td>{{ user.email }}</td>
                    <td>{{ user.active ? "Sí" : "No" }}</td>
                    <td>
                        <router-link :to="`/users/edit/${user.id}`" class="btn btn-sm btn-warning">Editar</router-link>
                        <button class="btn btn-sm btn-danger" @click="deleteUser(user.id)">Eliminar</button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
export default {
    name: "UserList",
    data() {
        return {
            users: []
        };
    },
    created() {
        this.fetchUsers();
    },
    methods: {
        async fetchUsers() {
            // Llama a la API para obtener usuarios
            const res = await fetch("/api/users");
            this.users = await res.json();
        },
        async deleteUser(id) {
            if (confirm("¿Seguro que deseas eliminar este usuario?")) {
                await fetch(`/api/users/${id}`, { method: "DELETE" });
                this.fetchUsers();
            }
        }
    }
};
</script>
