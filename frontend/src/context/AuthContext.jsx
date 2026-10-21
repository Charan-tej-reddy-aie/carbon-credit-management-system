import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import api from "../services/api";


const AuthContext =
    createContext(null);


export function AuthProvider({ children }) {

    const [user, setUser] =
        useState(null);

    const [loading, setLoading] =
        useState(true);


    /* =====================================================
       LOAD LOGIN SESSION
       ===================================================== */

    useEffect(() => {

        try {

            const storedUser =
                localStorage.getItem("user");

            const token =
                localStorage.getItem("token");

            /*
             * If either token or user is missing,
             * there is no valid frontend session.
             */

            if (
                token &&
                storedUser
            ) {

                const parsedUser =
                    JSON.parse(storedUser);

                setUser(parsedUser);

            } else {

                /*
                 * Clean incomplete authentication data.
                 */
                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "user"
                );

                setUser(null);
            }

        } catch (error) {

            console.error(
                "Failed to restore authentication:",
                error
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user"
            );

            setUser(null);

        } finally {

            setLoading(false);
        }

    }, []);


    /* =====================================================
       LOGIN
       ===================================================== */

    const login = async (
        email,
        password
    ) => {

        const response =
            await api.post(
                "/auth/login",
                {
                    email,
                    password
                }
            );

        const data =
            response.data;

        if (
            !data.success ||
            !data.token ||
            !data.user
        ) {

            throw new Error(
                data.message ||
                "Login failed"
            );
        }


        /*
         * IMPORTANT:
         *
         * Store the JWT using exactly
         * the key "token".
         *
         * api.js reads this same key.
         */

        localStorage.setItem(
            "token",
            data.token
        );


        /*
         * Store user information.
         */

        localStorage.setItem(
            "user",
            JSON.stringify(
                data.user
            )
        );


        /*
         * Update React state.
         */

        setUser(
            data.user
        );


        return data.user;
    };


    /* =====================================================
       LOGOUT
       ===================================================== */

    const logout = () => {

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "user"
        );

        /*
         * Remove possible old token keys
         * from previous versions.
         */

        localStorage.removeItem(
            "authToken"
        );

        localStorage.removeItem(
            "accessToken"
        );

        setUser(null);
    };


    /* =====================================================
       AUTH CONTEXT
       ===================================================== */

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}


/* =========================================================
   USE AUTH
   ========================================================= */

export function useAuth() {

    const context =
        useContext(
            AuthContext
        );

    if (!context) {

        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}