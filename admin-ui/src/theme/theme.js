import { createTheme } from "@mui/material/styles";
import { typography } from "./typography";

export const theme = createTheme({
    typography,
    palette: {
        primary: { main: "#1976d2" },
        secondary: { main: "#dc004e" },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    textTransform: "none",
                    fontWeight: 600,
                },
            },
        },
        MuiTypography: {
            defaultProps: {
                // tránh text bị mapping linh tinh
            },
        },
    },
});
