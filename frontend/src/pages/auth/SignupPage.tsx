import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { auth } from "../../api/endpoints";
import { toast } from "sonner";

const SignupPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSignup = async (data: any) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        ...(data.phone && { phone: data.phone })
      };
      await auth.signup(payload);
      toast.success("Account created! Please log in.");
      navigate("/login");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail ?? err.message ?? "Failed to create account");
    } finally {
      setLoading(false);
    }
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
      <div className="w-full lg:w-1/2 bg-slate-100 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create an account</h1>
            <p className="text-slate-500 font-medium mt-1">Get started with AssetFlow today.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSignup)} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Full Name</label>
              <input 
                type="text"
                {...register("name", { required: "Name is required", minLength: { value: 2, message: "Minimum 2 characters" } })}
                disabled={loading}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-sm font-medium text-red-500">{String(errors.name.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Email</label>
              <input 
                type="email"
                {...register("email", { 
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" }
                })}
                disabled={loading}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-1 text-sm font-medium text-red-500">{String(errors.email.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Phone (Optional)</label>
              <input 
                type="tel"
                {...register("phone")}
                disabled={loading}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
                placeholder="+1 234 567 890"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  {...register("password", { required: "Password is required", minLength: { value: 8, message: "Minimum 8 characters" } })}
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
              {errors.password && <p className="mt-1 text-sm font-medium text-red-500">{String(errors.password.message)}</p>}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70 shadow-md shadow-indigo-500/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Already have an account? <Link to="/login" className="text-indigo-600 hover:underline font-bold">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
