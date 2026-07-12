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
      <div className="w-full lg:w-1/2 bg-[#0B0B0F] flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md bg-[#1A1A22] border border-[#2A2A38] rounded-xl p-8">
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Create an account</h1>
            <p className="text-[#94A3B8] mt-1">Get started with AssetFlow today.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#EF4444] text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSignup)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Full Name</label>
              <input 
                type="text"
                {...register("name", { required: "Name is required", minLength: { value: 2, message: "Minimum 2 characters" } })}
                disabled={loading}
                className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg px-4 py-2.5 text-white placeholder-[#64748B] transition-colors"
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-sm text-[#EF4444]">{String(errors.name.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Email</label>
              <input 
                type="email"
                {...register("email", { 
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" }
                })}
                disabled={loading}
                className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg px-4 py-2.5 text-white placeholder-[#64748B] transition-colors"
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-[#EF4444]">{String(errors.email.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Phone (Optional)</label>
              <input 
                type="tel"
                {...register("phone")}
                disabled={loading}
                className="w-full bg-[#0B0B0F] border border-[#2A2A38] focus:border-[#22C55E] focus:outline-none rounded-lg px-4 py-2.5 text-white placeholder-[#64748B] transition-colors"
                placeholder="+1 234 567 890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  {...register("password", { required: "Password is required", minLength: { value: 8, message: "Minimum 8 characters" } })}
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
              {errors.password && <p className="mt-1 text-sm text-[#EF4444]">{String(errors.password.message)}</p>}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-[#22C55E] hover:bg-[#16a34a] text-black font-semibold rounded-lg py-2.5 px-5 flex items-center justify-center transition-colors disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-[#94A3B8]">
              Already have an account? <Link to="/login" className="text-[#22C55E] hover:underline font-medium">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
