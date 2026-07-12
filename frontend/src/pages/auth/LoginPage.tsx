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
    let timer: NodeJS.Timeout;
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
      login(res.data.token, res.data.user);
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
      <div className="hidden lg:flex w-1/2 bg-[#111118] flex-col justify-center px-16 relative border-r border-[#2A2A38]">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center text-white font-bold">
              AF
            </div>
            <span className="font-bold text-2xl text-[#22C55E]">AssetFlow</span>
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC] mb-6">Enterprise Asset & Resource Management</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-[#22C55E]" size={20} />
              <span className="text-[#94A3B8]">Track and allocate company assets efficiently</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-[#22C55E]" size={20} />
              <span className="text-[#94A3B8]">Manage bookings and maintenance seamlessly</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-[#22C55E]" size={20} />
              <span className="text-[#94A3B8]">Real-time analytics and detailed reporting</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 bg-[#0B0B0F] flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md bg-[#1A1A22] border border-[#2A2A38] rounded-xl p-8 relative overflow-hidden transition-all duration-300">
          
          {errorMsg && (
            <div className="mb-6 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#EF4444] text-sm">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg text-[#22C55E] text-sm">
              {successMsg}
            </div>
          )}

          {view === "login" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#F8FAFC]">Welcome back</h1>
                <p className="text-[#94A3B8] mt-1">Please enter your details to sign in.</p>
              </div>

              <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Email</label>
                  <input 
                    type="email"
                    {...registerLogin("email", { 
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" }
                    })}
                    disabled={loading}
                    className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg px-4 py-2.5 text-white placeholder-[#64748B] transition-colors"
                    placeholder="Enter your email"
                  />
                  {loginErrors.email && <p className="mt-1 text-sm text-[#EF4444]">{String(loginErrors.email.message)}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      {...registerLogin("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                      disabled={loading}
                      className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg pl-4 pr-10 py-2.5 text-white placeholder-[#64748B] transition-colors"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="mt-1 text-sm text-[#EF4444]">{String(loginErrors.password.message)}</p>}
                  
                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={() => { setView("forgot_email"); setErrorMsg(""); }} className="text-sm font-medium text-[#22C55E] hover:underline">
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign in"}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-[#94A3B8]">
                  Don't have an account? <Link to="/signup" className="text-[#22C55E] hover:underline font-medium">Sign up</Link>
                </p>
              </div>
            </div>
          )}

          {view === "forgot_email" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#F8FAFC]">Reset Password</h2>
                <p className="text-[#94A3B8] mt-1 text-sm">Enter your email and we'll send you an OTP.</p>
              </div>

              <form onSubmit={handleEmailSubmit(onForgotEmail)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Email</label>
                  <input 
                    type="email"
                    {...registerEmail("email", { 
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" }
                    })}
                    disabled={loading}
                    className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg px-4 py-2.5 text-white placeholder-[#64748B] transition-colors"
                  />
                  {emailErrors.email && <p className="mt-1 text-sm text-[#EF4444]">{String(emailErrors.email.message)}</p>}
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Send OTP"}
                </button>
              </form>
              
              <button onClick={resetToLogin} className="mt-6 flex items-center justify-center gap-2 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors w-full">
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          )}

          {view === "forgot_otp" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#F8FAFC]">Enter OTP</h2>
                <p className="text-[#94A3B8] mt-1 text-sm">We sent a code to <span className="text-[#F8FAFC]">{forgotEmail}</span></p>
              </div>

              <form onSubmit={onVerifyOtp} className="space-y-5">
                <div>
                  <input 
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg px-4 py-4 text-center text-2xl tracking-[0.5em] text-white font-mono transition-colors"
                    placeholder="------"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={otp.length !== 6}
                  className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70"
                >
                  Verify OTP
                </button>
              </form>

              <div className="mt-4 text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-[#64748B]">Resend in 0:{countdown.toString().padStart(2, '0')}</p>
                ) : (
                  <button onClick={() => onForgotEmail({email: forgotEmail})} className="text-sm text-[#22C55E] hover:underline font-medium">
                    Resend OTP
                  </button>
                )}
              </div>
              
              <button onClick={resetToLogin} className="mt-6 flex items-center justify-center gap-2 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors w-full">
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          )}

          {view === "forgot_password" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#F8FAFC]">Create new password</h2>
                <p className="text-[#94A3B8] mt-1 text-sm">Your new password must be different from previous used passwords.</p>
              </div>

              <form onSubmit={handlePasswordSubmit(onResetPassword)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      {...registerPassword("password", { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } })}
                      disabled={loading}
                      className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg pl-4 pr-10 py-2.5 text-white placeholder-[#64748B] transition-colors"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordErrors.password && <p className="mt-1 text-sm text-[#EF4444]">{String(passwordErrors.password.message)}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      {...registerPassword("confirm", { 
                        required: "Confirm password is required",
                        validate: (val) => val === watch("password") || "Passwords do not match"
                      })}
                      disabled={loading}
                      className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg pl-4 pr-10 py-2.5 text-white placeholder-[#64748B] transition-colors"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC]"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordErrors.confirm && <p className="mt-1 text-sm text-[#EF4444]">{String(passwordErrors.confirm.message)}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Reset Password"}
                </button>
              </form>
              
              <button onClick={resetToLogin} className="mt-6 flex items-center justify-center gap-2 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors w-full">
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
