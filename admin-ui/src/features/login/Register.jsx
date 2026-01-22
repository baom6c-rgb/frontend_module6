import {
    TextField,
    Button,
    MenuItem,
    Box,
    Typography,
    Card,
    CardContent,
    Stack
} from "@mui/material";
import { useEffect, useState } from "react";
import { getAllClassesApi } from "../../api/classApi.js";
import { getAllModulesApi } from "../../api/moduleApi.js";
import { registerApi } from "../../api/authApi.js";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [classes, setClasses] = useState([]);
    const [modules, setModules] = useState([]);
    const [form, setForm] = useState({
        email: "",
        password: "",
        fullName: "",
        classId: "",
        moduleId: "",
    });

    const navigate = useNavigate();

    useEffect(() => {
        getAllClassesApi().then(res => setClasses(res.data));
        getAllModulesApi().then(res => setModules(res.data));
    }, []);

    const submit = async () => {
        await registerApi(form);
        navigate("/login", {
            state: { registered: true }
        });
    };

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <Card sx={{ maxWidth: 420, mx: "auto", width: "100%" }}>
                <CardContent>
                    <Typography variant="h5" textAlign="center" mb={2}>
                        Đăng ký tài khoản
                    </Typography>

                    <Stack spacing={2}>
                        <TextField
                            label="Email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />

                        <TextField
                            type="password"
                            label="Password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />

                        <TextField
                            label="Full name"
                            value={form.fullName}
                            onChange={e => setForm({ ...form, fullName: e.target.value })}
                        />

                        <TextField
                            select
                            label="Class"
                            value={form.classId}
                            onChange={e => setForm({ ...form, classId: e.target.value })}
                        >
                            {classes.map(c => (
                                <MenuItem key={c.id} value={c.id}>
                                    {c.className}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Module"
                            value={form.moduleId}
                            onChange={e => setForm({ ...form, moduleId: e.target.value })}
                        >
                            {modules.map(m => (
                                <MenuItem key={m.id} value={m.id}>
                                    {m.moduleName}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Button
                            variant="contained"
                            size="large"
                            onClick={submit}
                        >
                            Đăng ký
                        </Button>

                        <Button
                            variant="text"
                            onClick={() => navigate("/login")}
                        >
                            Đã có tài khoản? Đăng nhập
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}