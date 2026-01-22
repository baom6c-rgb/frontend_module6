import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const GoogleLoginButton = () => {

    const handleSuccess = async (credentialResponse) => {
        try {
            const idToken = credentialResponse.credential;

            if (!idToken) {
                alert("Google token not found");
                return;
            }

            const res = await axios.post(
                "http://localhost:8080/api/auth/google",
                {
                    idToken: idToken
                }
            );

            const { accessToken, user } = res.data;

            // 👉 LƯU JWT
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("user", JSON.stringify(user));

            // 👉 redirect
            window.location.href = "/";
        } catch (err) {
            console.error(err);
            alert(
                err.response?.data?.message ||
                "Google login failed"
            );
        }
    };

    const handleError = () => {
        alert("Google Login Failed");
    };

    return (
        <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap
        />
    );
};

export default GoogleLoginButton;