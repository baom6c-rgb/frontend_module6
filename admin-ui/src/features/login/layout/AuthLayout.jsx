import { Container, Paper } from "@mui/material";

export default function AuthLayout({ children }) {
    return (
        <Container maxWidth="sm" sx={{ mt: 10 }}>
            <Paper sx={{ p: 4 }}>{children}</Paper>
        </Container>
    );
}