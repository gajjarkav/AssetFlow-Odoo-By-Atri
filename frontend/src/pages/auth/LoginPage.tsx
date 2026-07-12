import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/client";
import { auth } from "../../api/endpoints";

type ViewState = "login" | "forgot_email" | "forgot_otp" | "forgot_password";

const LoginPage: React.FC = () => {
  const [view, setView] = useState<ViewState>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm();
  const { register: registerEmail, handleSubmit: handleEmailSubmit, formState: { errors: emailErrors } } = useForm();
  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, watch } = useForm();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const onLogin = async (data: any) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await auth.login(data.email, data.password);
      login(res.data.access_token, res.data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail ?? err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onForgotEmail = async (data: any) => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setForgotEmail(data.email);
      setSuccessMsg("OTP sent to your email");
      setView("forgot_otp");
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail ?? err.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      setErrorMsg("");
      setView("forgot_password");
    } else {
      setErrorMsg("Please enter a 6-digit OTP");
    }
  };

  const onResetPassword = async (data: any) => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await api.post("/auth/reset-password", { email: forgotEmail, otp, new_password: data.password });
      setSuccessMsg("Password reset successfully. Redirecting...");
      setTimeout(() => {
        setView("login");
        setSuccessMsg("");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail ?? err.message ?? "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setView("login");
    setErrorMsg("");
    setSuccessMsg("");
    setOtp("");
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-1/2 bg-slate-50 flex-col justify-center px-16 relative border-r border-slate-200">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              AF
            </div>
            <span className="font-bold text-2xl text-indigo-600 tracking-tight">AssetFlow</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Enterprise Asset & Resource Management</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-indigo-600" size={20} />
              <span className="text-slate-600 font-medium">Track and allocate company assets efficiently</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-indigo-600" size={20} />
              <span className="text-slate-600 font-medium">Manage bookings and maintenance seamlessly</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-indigo-600" size={20} />
              <span className="text-slate-600 font-medium">Real-time analytics and detailed reporting</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 bg-slate-100 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 relative overflow-hidden transition-all duration-300 shadow-xl">
          
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm font-medium">
              {successMsg}
            </div>
          )}

          {view === "login" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
                <p className="text-slate-500 mt-1 font-medium">Please enter your details to sign in.</p>
              </div>

              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Email</label>
                  <input 
                    type="email"
                    {...registerLogin("email", { 
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" }
                    })}
                    disabled={loading}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                    placeholder="Enter your email"
                  />
                  {loginErrors.email && <p className="mt-1 text-sm font-medium text-red-500">{String(loginErrors.email.message)}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      {...registerLogin("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                      disabled={loading}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg pl-4 pr-10 py-2.5 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="mt-1 text-sm font-medium text-red-500">{String(loginErrors.password.message)}</p>}
                  
                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={() => { setView("forgot_email"); setErrorMsg(""); }} className="text-sm font-bold text-indigo-600 hover:underline">
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70 shadow-md shadow-indigo-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign in"}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-slate-500">
                  Don't have an account? <Link to="/signup" className="text-indigo-600 hover:underline font-bold">Sign up</Link>
                </p>
              </div>
            </div>
          )}

          {view === "forgot_email" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reset Password</h2>
                <p className="text-slate-500 font-medium mt-1 text-sm">Enter your email and we'll send you an OTP.</p>
              </div>

              <form onSubmit={handleEmailSubmit(onForgotEmail)} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Email</label>
                  <input 
                    type="email"
                    {...registerEmail("email", { 
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" }
                    })}
                    disabled={loading}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                  />
                  {emailErrors.email && <p className="mt-1 text-sm font-medium text-red-500">{String(emailErrors.email.message)}</p>}
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70 shadow-md shadow-indigo-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Send OTP"}
                </button>
              </form>
              
              <button onClick={resetToLogin} className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors w-full">
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          )}

          {view === "forgot_otp" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Enter OTP</h2>
                <p className="text-slate-500 font-medium mt-1 text-sm">We sent a code to <span className="font-bold text-slate-900">{forgotEmail}</span></p>
              </div>

              <form onSubmit={onVerifyOtp} className="space-y-5">
                <div>
                  <input 
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-4 py-4 text-center text-2xl tracking-[0.5em] text-slate-900 font-mono transition-all shadow-sm"
                    placeholder="------"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={otp.length !== 6}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70 shadow-md shadow-indigo-500/20"
                >
                  Verify OTP
                </button>
              </form>

              <div className="mt-4 text-center">
                {countdown > 0 ? (
                  <p className="text-sm font-bold text-slate-500">Resend in 0:{countdown.toString().padStart(2, '0')}</p>
                ) : (
                  <button onClick={() => onForgotEmail({email: forgotEmail})} className="text-sm text-indigo-600 hover:underline font-bold">
                    Resend OTP
                  </button>
                )}
              </div>
              
              <button onClick={resetToLogin} className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors w-full">
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          )}

          {view === "forgot_password" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create new password</h2>
                <p className="text-slate-500 font-medium mt-1 text-sm">Your new password must be different from previous used passwords.</p>
              </div>

              <form onSubmit={handlePasswordSubmit(onResetPassword)} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      {...registerPassword("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                      disabled={loading}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg pl-4 pr-10 py-2.5 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordErrors.password && <p className="mt-1 text-sm font-medium text-red-500">{String(passwordErrors.password.message)}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      {...registerPassword("confirm", { 
                        required: "Confirm password is required",
                        validate: (val) => val === watch("password") || "Passwords do not match"
                      })}
                      disabled={loading}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg pl-4 pr-10 py-2.5 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordErrors.confirm && <p className="mt-1 text-sm font-medium text-red-500">{String(passwordErrors.confirm.message)}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70 shadow-md shadow-indigo-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Reset Password"}
                </button>
              </form>
              
              <button onClick={resetToLogin} className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors w-full">
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
