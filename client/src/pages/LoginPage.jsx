import React, { useState, useContext } from 'react'
import assets from '../assets/assets'
import { AuthContext } from '../../context/AuthContext'

const SIGNUP = "Sign Up";
const LOGIN = "Login";

const LoginPage = () => {

  const [currState, setCurrState] = useState(SIGNUP);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);

  const { login } = useContext(AuthContext);

  const onSubmitHandler = (e) => {
    e.preventDefault();

    if (currState === SIGNUP && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }

    const apiState = currState === SIGNUP ? "signup" : "login";
    login(apiState, { fullName, email, password, bio });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#020617]">

      <div className="w-full max-w-6xl flex items-center justify-evenly max-sm:flex-col gap-10 px-6">

        {/* LOGO ONLY (NO EXTRA TEXT) */}
        <img 
          src={assets.logo_big} 
          alt="QuickChat Logo" 
          className="w-[min(35vw,260px)]"
        />

        {/* FORM CARD */}
        <form
          onSubmit={onSubmitHandler}
          className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20
                     p-8 rounded-2xl shadow-2xl flex flex-col gap-6 text-white"
        >
          <h2 className="text-3xl font-semibold">
            {currState}
          </h2>

          {currState === SIGNUP && !isDataSubmitted && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="auth-input"
            />
          )}

          {!isDataSubmitted && (
            <>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
            </>
          )}

          {currState === SIGNUP && isDataSubmitted && (
            <textarea
              rows={3}
              placeholder="Provide a short bio..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="auth-input resize-none"
            />
          )}

          <button className="bg-violet-600 hover:bg-violet-700 transition text-white py-3 rounded-xl font-semibold">
            {currState === SIGNUP ? "Create Account" : "Login Now"}
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" className="accent-violet-500" />
            <span>I agree to terms & policy</span>
          </div>

          <p className="text-sm text-gray-400 text-center">
            {currState === SIGNUP ? (
              <>
                Already have an account?{" "}
                <span
                  onClick={() => { setCurrState(LOGIN); setIsDataSubmitted(false); }}
                  className="text-violet-400 cursor-pointer hover:underline"
                >
                  Login here
                </span>
              </>
            ) : (
              <>
                Create new account?{" "}
                <span
                  onClick={() => setCurrState(SIGNUP)}
                  className="text-violet-400 cursor-pointer hover:underline"
                >
                  Click here
                </span>
              </>
            )}
          </p>
        </form>

      </div>
    </div>
  );
};

export default LoginPage;
