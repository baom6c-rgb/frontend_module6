import React, { useState } from "react";
import { TextField, IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

/**
 * Reusable Password Field with show/hide toggle.
 * Usage:
 * <PasswordField label="Mật khẩu" value={...} onChange={...} error={...} helperText={...} />
 */
export default function PasswordField({
                                          label = "Mật khẩu",
                                          value,
                                          onChange,
                                          error,
                                          helperText,
                                          disabled,
                                          fullWidth = true,
                                          name = "password",
                                          autoComplete = "current-password",
                                          ...rest
                                      }) {
    const [show, setShow] = useState(false);

    return (
        <TextField
            {...rest}
            name={name}
            label={label}
            value={value}
            onChange={onChange}
            error={error}
            helperText={helperText}
            disabled={disabled}
            fullWidth={fullWidth}
            type={show ? "text" : "password"}
            autoComplete={autoComplete}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                            onClick={() => setShow((v) => !v)}
                            edge="end"
                            aria-label={show ? "Hide password" : "Show password"}
                        >
                            {show ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                ),
            }}
        />
    );
}
