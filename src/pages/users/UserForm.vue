<template>
    <div>
        <h1>{{ isEdit ? "Editar Usuario" : "Crear Usuario" }}</h1>
        <form @submit.prevent="handleSubmit">
            <div class="mb-3">
                <label>Usuario</label>
                <input v-model="form.username" required class="form-control" />
            </div>
            <div class="mb-3">
                <label>Email</label>
                <input v-model="form.email" type="email" class="form-control" />
            </div>
            <div class="mb-3">
                <label>Contraseña</label>
                <input v-model="form.password" :required="!isEdit" type="password" class="form-control" />
            </div>
            <div class="mb-3">
                <label>Activo</label>
                <input v-model="form.active" type="checkbox" />
            </div>
            <button class="btn btn-primary" type="submit">Guardar</button>
            <router-link to="/users" class="btn btn-secondary">Cancelar</router-link>
        </form>
    </div>
</template>

<script>
export default {
    name: "UserForm",
    data() {
        return {
            form: {
                username: "",
                email: "",
                password: "",
                active: true
            },
            isEdit: false
        };
    },
    async created() {
        if (this.$route.params.id) {
            this.isEdit = true;
            const res = await fetch(`/api/users/${this.$route.params.id}`);
            const user = await res.json();
            this.form = {
                ...user,
                password: ""
            };
        }
    },
    methods: {
        async handleSubmit() {
            if (this.isEdit) {
                await fetch(`/api/users/${this.$route.params.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(this.form)
                });
            } else {
                await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(this.form)
                });
            }
            this.$router.push("/users");
        }
    }
};
</script>
