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

  const onSubmitHandler = (event) => {
    event.preventDefault();

    if (currState === SIGNUP && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }

    const apiState = currState === SIGNUP ? "signup" : "login";

    login(apiState, { fullName, email, password, bio });
  };

  return (
    <div>
      <div className='min-h-screen bg-cover bg-center flex items-center
      justify-center gap-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl'>
        <img src={assets.logo_big} alt='' className='w-[min(30vw,250px)]' />

        <form 
          onSubmit={onSubmitHandler} 
          className='border-2 bg-white/8 text-white border-gray-500 p-6 flex
          flex-col gap-6 rounded-lg shadow-lg'
        >
          <h2 className='font-medium text-2xl flex justify-between items-center'>
            {currState}
            {isDataSubmitted && (
              <img 
                onClick={() => setIsDataSubmitted(false)} 
                src={assets.arrow_icon} 
                alt='' 
                className='w-5 cursor-pointer' 
              />
            )}
          </h2>

          {currState === SIGNUP && !isDataSubmitted && (
            <input
              onChange={(e) => setFullName(e.target.value)}
              value={fullName}
              type="text"
              className='p-2 border border-gray-500 rounded-md focus:outline-none'
              placeholder='Full Name'
              required
            />
          )}

          {!isDataSubmitted && (
            <>
              <input 
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                type="email"
                placeholder='Email Address'
                required
                className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
              <input 
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                type="password"
                placeholder='Password'
                required
                className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
            </>
          )}

          {currState === SIGNUP && isDataSubmitted && (
            <textarea 
              onChange={(e) => setBio(e.target.value)}
              value={bio}
              rows={4}
              className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
              placeholder='Provide a short bio...'
            ></textarea>
          )}

          <button type="submit" className="bg-violet-600 py-2 rounded-md hover:bg-violet-700 transition">
            {currState === SIGNUP ? "Create Account" : "Login Now"}
          </button>

          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <input type="checkbox" />
            <p>Agree to my terms and my policy</p>
          </div>

          <div className='flex flex-col gap-2'>
            {currState === SIGNUP ? (
              <p className='text-sm text-gray-600'>
                Already made account?{" "}
                <span 
                  onClick={() => {setCurrState(LOGIN); setIsDataSubmitted(false)}} 
                  className='font-medium text-violet-500 cursor-pointer'
                >
                  Login Here
                </span>
              </p>
            ) : (
              <p className='text-sm text-gray-600'>
                Create an Account{" "}
                <span 
                  onClick={() => setCurrState(SIGNUP)} 
                  className='font-medium text-violet-500 cursor-pointer'
                >
                  Click here
                </span>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;