import axios from "axios";


/* =========================================================
   AXIOS INSTANCE
   ========================================================= */

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api"),

    headers: {
        "Content-Type": "application/json"
    }
});


/* =========================================================
   REQUEST INTERCEPTOR
   ========================================================= */

api.interceptors.request.use(
    (config) => {

        /*
         * Get JWT token from browser storage.
         */
        const token =
            localStorage.getItem("token");

        /*
         * Send token with every API request.
         */
        if (token) {

            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);


/* =========================================================
   RESPONSE INTERCEPTOR
   ========================================================= */

api.interceptors.response.use(
    (response) => {
        return response;
    },

    (error) => {

        /*
         * If the backend says the token is
         * invalid or expired, remove it.
         */
        if (
            error.response &&
            error.response.status === 401
        ) {

            const message =
                error.response.data?.message;

            if (
                message ===
                    "Invalid or expired authentication token" ||
                message ===
                    "Authentication token is required"
            ) {
                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "user"
                );
            }
        }

        return Promise.reject(error);
    }
);


/* =========================================================
   EXPORT
   ========================================================= */

export default api;