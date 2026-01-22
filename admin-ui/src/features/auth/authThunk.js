import { createAsyncThunk } from "@reduxjs/toolkit";
import { loginApi, googleLoginApi } from "../../api/authApi";

export const loginThunk = createAsyncThunk(
    "auth/login",
    async (data, { rejectWithValue }) => {
        try {
            const res = await loginApi(data);
            return res.data;
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Login failed";
            return rejectWithValue(msg);
        }
    }
);

export const googleLoginThunk = createAsyncThunk(
    "auth/googleLogin",
    async (idToken, { rejectWithValue }) => {
        try {
            const res = await googleLoginApi(idToken);
            return res.data;
        } catch (err) {
            return rejectWithValue(
                err.response?.data || "Google login failed"
            );
        }
    }
);