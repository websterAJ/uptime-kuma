<template>
    <div class="my-4">
        <h5 class="my-4 settings-subheading">{{ $t("User Management") }}</h5>

        <div v-if="loadingUsers" class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">{{ $t("Loading...") }}</span>
            </div>
        </div>

        <div v-if="!loadingUsers && users.length === 0" class="alert alert-info">
            {{ $t("No users found.") }}
        </div>

        <div v-if="!loadingUsers && users.length > 0">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>{{ $t("Username") }}</th>
                        <th>{{ $t("UserType") }}</th>
                        <th>{{ $t("Actions") }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in users" :key="user.id">
                        <td>{{ user.username }}</td>
                        <td>
                            <span v-if="!user.editing">{{ $t(user.userType) }}</span>
                            <select v-else v-model="user.selected_type" class="form-select form-select-sm w-auto">
                                <option v-for="type in availableUserTypes" :key="type" :value="type">
                                    {{ $t(type) }}
                                </option>
                            </select>
                        </td>
                        <td>
                            <button v-if="!user.editing" class="btn btn-sm btn-outline-primary me-2" @click="startEditUserType(user)">
                                <font-awesome-icon icon="edit" /> {{ $t("Edit Type") }}
                            </button>
                            <template v-if="user.editing">
                                <button class="btn btn-sm btn-primary me-2" @click="saveUserType(user)">
                                    <font-awesome-icon icon="save" /> {{ $t("Save") }}
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" @click="cancelEditUserType(user)">
                                    <font-awesome-icon icon="times" /> {{ $t("Cancel") }}
                                </button>
                            </template>
                            <!-- Add other actions like delete user if needed -->
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <!-- Add User Button -->
        <div v-if="currentUserType === 'admin'" class="mt-4">
            <button class="btn btn-primary" @click="openAddUserDialog">
                <font-awesome-icon icon="plus" /> {{ $t("Add User") }}
            </button>
        </div>

        <AddUserDialog ref="addUserDialog" @user-added="handleUserAdded" />
    </div>
</template>

<script>
import AddUserDialog from "./AddUserDialog.vue"; // Import the new dialog component

export default {
    components: { // Register the component
        AddUserDialog,
    },
    data() {
        return {
            loadingUsers: false,
            users: [],
            availableUserTypes: ["admin", "editor", "viewer"], // Should match backend
        };
    },
    computed: {
        // Access current logged-in user's type if needed for conditional UI
        currentUserType() {
            // This assumes user info including type is available in $root or a store
            // For now, we'll rely on backend to enforce admin actions
            return this.$root.userType || "admin"; // Fallback for example
        }
    },
    created() {
        this.fetchUsers();
    },
    methods: {
        fetchUsers() {
            this.loadingUsers = true;
            this.$root.getSocket().emit("getUsers", (res) => {
                this.loadingUsers = false;
                if (res.ok) {
                    console.log("Fetched users:", res);
                    this.users = res.users.map(user => ({
                        ...user,
                        editing: false,
                        selected_type: user.userType, // For select dropdown
                        original_type: user.userType, // To revert on cancel
                    }));
                } else {
                    this.$root.toastError(res.msg || this.$t("Failed to load users."));
                }
            });
        },
        startEditUserType(user) {
            // Only allow admins to edit (though backend enforces this too)
            // if (this.currentUserType !== 'admin') {
            //     this.$root.toastError(this.$t("You do not have permission to edit user types."));
            //     return;
            // }
            user.editing = true;
        },
        cancelEditUserType(user) {
            user.selected_type = user.original_type;
            user.editing = false;
        },
        saveUserType(user) {
            if (user.id === this.$root.userID && user.selected_type !== "admin") {
                // Assuming $root.userID holds the current logged-in user's ID
                const adminUsers = this.users.filter(u => u.original_type === "admin");
                if (adminUsers.length === 1 && adminUsers[0].id === user.id) {
                    this.$root.toastError(this.$t("You cannot change the type of the only administrator."));
                    return;
                }
            }

            this.$root.getSocket().emit("updateUserType", user.id, user.selected_type, (res) => {
                if (res.ok) {
                    this.$root.toastSuccess(res.msg || this.$t("User type updated successfully."));
                    user.userType = user.selected_type;
                    user.original_type = user.selected_type;
                    user.editing = false;
                    // Optional: if the current user's type was changed, may need to update $root.userType or re-fetch user info
                } else {
                    this.$root.toastError(res.msg || this.$t("Failed to update user type."));
                    // Revert optimistic update if needed, or re-fetch users
                    user.selected_type = user.original_type;
                }
            });
        },
        openAddUserDialog() {
            this.$refs.addUserDialog.show();
        },
        handleUserAdded() {
            this.fetchUsers(); // Refresh the user list after a new user is added
        },
        // Add methods for deleteUser in the future if required
    },
};
</script>

<style scoped>
.settings-subheading {
    font-weight: bold;
}
.w-auto {
    width: auto !important;
}
</style>
