import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { useDispatch } from "react-redux";
import { logout } from "../../auth/authSlice.js";

export default function MainLayout({ children }) {
    const dispatch = useDispatch();

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Box sx={{ flexGrow: 1 }}>Student Management</Box>
                    <Button color="inherit" onClick={() => dispatch(logout())}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>
            <Box p={3}>{children}</Box>
        </>
    );
}