import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { emailIcon, googleIcon } from "../assets/icons";
import { httpRequest } from "../interceptor/axiosInterceptor";
import { neonAuthUrl, url } from "../baseUrl";
import { useAuth, User } from "../contexts/Auth";

type SignInBoxType = {
  message?: string;
  typeOfLogin: string;
};

const SIGNIN_OPTIONS = [
  {
    id: 1,
    title: "with Google",
    handler: "Google",
    image: googleIcon,
  },
  {
    id: 2,
    title: "with email",
    handler: "mail",
    image: emailIcon,
  },
];

export default function SignInBox({ message, typeOfLogin }: SignInBoxType) {
  function handleGoogleAuth() {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: import.meta.env.VITE_GOOGLE_OAUTH_REDIRECT_URL,
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };
    const qs = new URLSearchParams(options);
    window.location.assign(`${rootUrl}?${qs.toString()}`);
  }
  const navigate = useNavigate();
  const { handleUser } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const isSignUp = typeOfLogin === "Sign up";
      const payload = isSignUp
        ? { name, email, password, callbackURL: window.location.origin }
        : { email, password, callbackURL: window.location.origin };
      const response = url
        ? await httpRequest.post(`${url}/auth/email`, payload)
        : await fetch(`${neonAuthUrl.replace(/\/$/, "")}/${isSignUp ? "sign-up/email" : "sign-in/email"}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(payload),
          }).then(async (result) => {
            const data = await result.json();
            if (!result.ok) throw Object.assign(new Error("Neon Auth request failed"), { response: { data } });
            return { data };
          });
      const sessionToken = response.data.access_token ?? response.data.token;
      if (sessionToken) localStorage.setItem("access_token", JSON.stringify(sessionToken));
      if (response.data.refresh_token) localStorage.setItem("refresh_token", JSON.stringify(response.data.refresh_token));
      const authUser = response.data.user;
      handleUser({
        ...authUser,
        _id: authUser?._id ?? authUser?.id,
        name: authUser?.name ?? name,
        email: authUser?.email ?? email,
      } as User);
      navigate("/");
    } catch (requestError: any) {
      const message = requestError.response?.data?.message ?? requestError.response?.data?.error;
      setError(
        message ||
          (neonAuthUrl
            ? "Neon Auth rejected the request. Check the email, password, and that this preview URL is trusted."
            : "Authentication service is not configured.")
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      style={{
        width: "650px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "8vh 0",
        boxShadow:
          "rgb(190, 190, 190) 2px 2px 12px, rgb(255, 255, 255) -20px -20px 60px",
      }}
    >
      <p
        style={{
          fontFamily: "Roboto Slab",
          fontSize: "28px",
          marginBottom: "30px",
        }}
      >
        {message}
      </p>
      {error && <p style={{ color: "#b42318", fontSize: "14px" }}>{error}</p>}
      {showEmailForm && (
        <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "280px" }}>
          {typeOfLogin === "Sign up" && <input aria-label="Name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />}
          <input aria-label="Email" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input aria-label="Password" type="password" placeholder="Password (8+ characters)" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? "Working..." : typeOfLogin}</button>
        </form>
      )}
      {SIGNIN_OPTIONS.map((item) => {
        return (
          <ButtonLoginWith
            image={item.image}
            key={item.id}
            onClick={() => {
              if (item.handler === "Google") handleGoogleAuth();
              else setShowEmailForm(true);
            }}
            text={typeOfLogin + " " + item.title}
          />
        );
      })}
      {typeOfLogin === "Sign in" ? (
        <p style={{ marginTop: "22px", color: "#5c5c5c" }}>
          No account?{" "}
          <Link
            style={{
              color: "#1a8917",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "14px",
            }}
            to="/signin/new"
          >
            Create one
          </Link>
        </p>
      ) : (
        <p style={{ marginTop: "22px", color: "#5c5c5c" }}>
          Already have an account?{" "}
          <Link
            style={{
              color: "#1a8917",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "14px",
            }}
            to="/signin/in"
          >
            Sign in
          </Link>
        </p>
      )}

      <p
        style={{
          fontSize: "13px",
          color: "gray",
          width: "78%",
          textAlign: "center",
          lineHeight: "22px",
          marginTop: "22px",
        }}
      >
        Click “{typeOfLogin}” to agree to Faundry’s Terms of Service and
        acknowledge that Faundry’s Privacy Policy applies to you.
      </p>
    </div>
  );
}

function ButtonLoginWith({
  image,
  onClick,
  text,
}: {
  onClick(): void;
  text: string;
  image: any;
}) {
  return (
    <button
      style={{
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "6px 14px",
        borderRadius: "18px",
        width: "200px",
        border: "1px solid #c9c9c9",
        gap: "12px",
        cursor: "pointer",
        color: "#5c5c5c",
      }}
      onClick={() => {
        onClick();
      }}
    >
      {image}
      {text}
    </button>
  );
}
