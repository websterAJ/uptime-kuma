<template>
    <div
        :id="modalId"
        class="modal fade"
        tabindex="-1"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        :aria-labelledby="modalId + 'Label'"
        aria-hidden="true"
    >
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 :id="modalId + 'Label'" class="modal-title">
                        {{ $t("Add New User") }}
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        :aria-label="$t('Close')"
                        @click="closeDialog"
                    ></button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent="submitForm">
                        <div class="mb-3">
                            <label for="username" class="form-label">{{ $t("Username") }}</label>
                            <input
                                id="username"
                                v-model="form.username"
                                type="text"
                                class="form-control"
                                :class="{'is-invalid': validationErrors.username}"
                                required
                            />
                            <div v-if="validationErrors.username" class="invalid-feedback">
                                {{ validationErrors.username }}
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="password" class="form-label">{{ $t("Password") }}</label>
                            <input
                                id="password"
                                v-model="form.password"
                                type="password"
                                class="form-control"
                                :class="{'is-invalid': validationErrors.password}"
                                required
                                autocomplete="new-password"
                            />
                            <div v-if="validationErrors.password" class="invalid-feedback">
                                {{ validationErrors.password }}
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="confirmPassword" class="form-label">{{ $t("Confirm Password") }}</label>
                            <input
                                id="confirmPassword"
                                v-model="form.confirmPassword"
                                type="password"
                                class="form-control"
                                :class="{'is-invalid': validationErrors.confirmPassword}"
                                required
                                autocomplete="new-password"
                            />
                            <div v-if="validationErrors.confirmPassword" class="invalid-feedback">
                                {{ validationErrors.confirmPassword }}
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="userType" class="form-label">{{ $t("User Type") }}</label>
                            <select
                                id="userType"
                                v-model="form.user_type"
                                class="form-select"
                                :class="{'is-invalid': validationErrors.user_type}"
                                required
                            >
                                <option v-for="type in availableUserTypes" :key="type" :value="type">
                                    {{ $t(type) }}
                                </option>
                            </select>
                            <div v-if="validationErrors.user_type" class="invalid-feedback">
                                {{ validationErrors.user_type }}
                            </div>
                        </div>

                        <div v-if="generalError" class="alert alert-danger">
                            {{ generalError }}
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary me-2" @click="closeDialog">
                                {{ $t("Cancel") }}
                            </button>
                            <button type="submit" class="btn btn-primary" :disabled="submitting">
                                <div v-if="submitting" class="spinner-border spinner-border-sm me-1" role="status">
                                    <span class="visually-hidden">{{ $t("Loading...") }}</span>
                                </div>
                                {{ $t("Add User") }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { Modal } from "bootstrap";

export default {
    props: {
        modalId: {
            type: String,
            default: "addUserModal",
        },
    },
    emits: ["userAdded", "hidden"],
    data() {
        return {
            modal: null,
            form: {
                username: "",
                password: "",
                confirmPassword: "",
                user_type: "viewer", // Default type
            },
            availableUserTypes: ["admin", "editor", "viewer"], // Should match backend and UserManagement.vue
            validationErrors: {},
            generalError: "",
            submitting: false,
        };
    },
    mounted() {
        this.modal = new Modal(document.getElementById(this.modalId));
        // Reset form when modal is hidden
        document.getElementById(this.modalId).addEventListener("hidden.bs.modal", () => {
            this.resetForm();
            this.$emit("hidden");
        });
    },
    methods: {
        show() {
            this.resetForm();
            this.modal.show();
        },
        closeDialog() {
            this.modal.hide();
        },
        resetForm() {
            this.form.username = "";
            this.form.password = "";
            this.form.confirmPassword = "";
            this.form.user_type = "viewer";
            this.validationErrors = {};
            this.generalError = "";
            this.submitting = false;
        },
        validateForm() {
            this.validationErrors = {};
            let isValid = true;

            if (!this.form.username.trim()) {
                this.validationErrors.username = this.$t("Username is required.");
                isValid = false;
            }
            // Basic username validation (can be enhanced)
            if (this.form.username.includes(" ")) {
                this.validationErrors.username = this.$t("Username cannot contain spaces.");
                isValid = false;
            }

            if (!this.form.password) {
                this.validationErrors.password = this.$t("Password is required.");
                isValid = false;
            } else if (this.form.password.length < 6) { // Example: min length
                this.validationErrors.password = this.$t("Password must be at least 6 characters long.");
                isValid = false;
            }

            if (this.form.password !== this.form.confirmPassword) {
                this.validationErrors.confirmPassword = this.$t("Passwords do not match.");
                isValid = false;
            }

            if (!this.availableUserTypes.includes(this.form.user_type)) {
                this.validationErrors.user_type = this.$t("Invalid user type selected.");
                isValid = false;
            }
            return isValid;
        },
        submitForm() {
            this.generalError = "";
            if (!this.validateForm()) {
                return;
            }

            this.submitting = true;
            const userData = {
                username: this.form.username,
                password: this.form.password,
                user_type: this.form.user_type,
            };

            this.$root.getSocket().emit("createUser", userData, (res) => {
                this.submitting = false;
                if (res.ok) {
                    this.$root.toastSuccess(res.msg || this.$t("User added successfully!"));
                    this.$emit("userAdded");
                    this.closeDialog();
                } else {
                    this.generalError = res.msg || this.$t("Failed to add user. Please try again.");
                    // Potentially handle specific field errors from backend if provided
                    if (res.fieldErrors) {
                        this.validationErrors = { ...this.validationErrors, ...res.fieldErrors };
                    }
                }
            });
        },
    },
};
</script>

<style scoped>
/* Add any specific styles for the dialog here */
</style>
