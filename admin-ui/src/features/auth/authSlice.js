import { createSlice } from '@reduxjs/toolkit';
import { loginThunk, googleLoginThunk } from './authThunk';

// ✅ Helper function to load auth data from localStorage
const loadAuthFromStorage = () => {
    try {
        const token = localStorage.getItem('accessToken');
        const rolesStr = localStorage.getItem('userRoles');
        const userStr = localStorage.getItem('userData');

        return {
            token: token || null,
            roles: rolesStr ? JSON.parse(rolesStr) : [],
            user: userStr ? JSON.parse(userStr) : null,
        };
    } catch (error) {
        console.error('Error loading auth from localStorage:', error);
        return {
            token: null,
            roles: [],
            user: null,
        };
    }
};

// ✅ Initialize state with data from localStorage
const authData = loadAuthFromStorage();

const initialState = {
    user: authData.user,
    token: authData.token,
    roles: authData.roles,
    loading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.roles = [];

            // ✅ Clear all auth data from localStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userRoles');
            localStorage.removeItem('userData');
        },
        clearError: (state) => {
            state.error = null;
        },
        // ✅ Manual set auth
        setAuth: (state, action) => {
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.roles = action.payload.roles || [];

            // Save to localStorage
            if (action.payload.token) {
                localStorage.setItem('accessToken', action.payload.token);
            }
            if (action.payload.roles) {
                localStorage.setItem('userRoles', JSON.stringify(action.payload.roles));
            }
            if (action.payload.user) {
                localStorage.setItem('userData', JSON.stringify(action.payload.user));
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // ========== Normal Login ==========
            .addCase(loginThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.roles = action.payload.roles || [];

                // ✅ Save token
                if (action.payload.token) {
                    state.token = action.payload.token;
                    localStorage.setItem('accessToken', action.payload.token);
                }

                // ✅ Save roles to localStorage
                if (action.payload.roles) {
                    localStorage.setItem('userRoles', JSON.stringify(action.payload.roles));
                }

                // ✅ Save user data to localStorage
                if (action.payload) {
                    localStorage.setItem('userData', JSON.stringify(action.payload));
                }
            })
            .addCase(loginThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // ========== Google Login ==========
            .addCase(googleLoginThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(googleLoginThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.roles = action.payload.roles || [];

                // ✅ Save token
                if (action.payload.token) {
                    state.token = action.payload.token;
                    localStorage.setItem('accessToken', action.payload.token);
                }

                // ✅ Save roles to localStorage
                if (action.payload.roles) {
                    localStorage.setItem('userRoles', JSON.stringify(action.payload.roles));
                }

                // ✅ Save user data to localStorage
                if (action.payload) {
                    localStorage.setItem('userData', JSON.stringify(action.payload));
                }
            })
            .addCase(googleLoginThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { logout, clearError, setAuth } = authSlice.actions;
export default authSlice.reducer;