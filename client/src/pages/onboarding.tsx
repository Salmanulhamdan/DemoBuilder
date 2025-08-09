import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Brain, Mail, Settings, Check, Copy, Info } from "lucide-react";

type Screen = "email" | "otp" | "progress" | "success";

interface ProgressStep {
  id: string;
  text: string;
  completed: boolean;
  active: boolean;
}

export default function Onboarding() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [websiteInfo, setWebsiteInfo] = useState<{ domain: string; title: string; description: string } | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { id: "step1", text: "Analyzing company website", completed: false, active: false },
    { id: "step2", text: "Creating knowledge base", completed: false, active: false },
    { id: "step3", text: "Configuring your ainager", completed: false, active: false },
    { id: "step4", text: "Done", completed: false, active: false }
  ]);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentProgressText, setCurrentProgressText] = useState("Initializing...");
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = async () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Prevent common public email providers
    const publicDomains = new Set([
      "gmail.com","yahoo.com","yahoo.co.in","outlook.com","hotmail.com","live.com","msn.com","icloud.com","me.com","mac.com","aol.com","proton.me","protonmail.com","gmx.com","mail.com","zoho.com","yandex.com","hey.com","duck.com"
    ]);
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || publicDomains.has(domain)) {
      setEmailError("Please use your company email address");
      return;
    }
    
    if (otpSent) {
      setEmailError("OTP already sent. Please check your email or wait before requesting another.");
      return;
    }
    
    try {
      setEmailError("");
      setIsLoading(true);
      
      // Request OTP from server
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to request verification code");
      }
      setOtpSent(true);
      
      setCurrentScreen("otp");
    } catch (e: any) {
      setEmailError(e?.message || "Failed to request verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Verify OTP server-side then analyze website
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Verification failed");
      }
      
      const data = await res.json();
      if (data.websiteInfo) {
        setWebsiteInfo(data.websiteInfo);
      }
      
      setCurrentScreen("progress");
      simulateProgress();
    } catch (e: any) {
      toast({ title: "Verification failed", description: e?.message || "Failed to analyze website", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (otpSent) {
      toast({
        title: "OTP Already Sent",
        description: "Please check your email for the verification code",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Resend Available",
      description: "You can request a new code if the previous one expires",
    });
  };

  const simulateProgress = async () => {
    let currentStep = 0;
    const steps = [
      "Analyzing company website",
      "Creating knowledge base", 
      "Configuring your ainager",
      "Done"
    ];
    
    const updateStep = async () => {
      if (currentStep > 0) {
        setProgressSteps(prev => 
          prev.map((step, index) => 
            index === currentStep - 1 
              ? { ...step, completed: true, active: false }
              : step
          )
        );
      }

      if (currentStep < steps.length) {
        setProgressSteps(prev => 
          prev.map((step, index) => 
            index === currentStep 
              ? { ...step, active: true }
              : step
          )
        );
        
        setCurrentProgressText(steps[currentStep] + "...");
        setProgressPercentage(((currentStep + 1) / steps.length) * 100);

        currentStep++;
        
        if (currentStep < steps.length) {
          setTimeout(() => updateStep(), 1200);
        } else {
          try {
            // Call backend to create ainager using email
            const res = await fetch("/api/ainager/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
              credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            const data: { shareableLink: string } = await res.json();
            setGeneratedLink(data.shareableLink);
          } catch (err: any) {
            toast({ title: "Setup error", description: err?.message || "Failed to create ainager", variant: "destructive" });
          }
          setTimeout(() => {
            setProgressSteps(prev => 
              prev.map((step, index) => 
                index === steps.length - 1 
                  ? { ...step, completed: true, active: false }
                  : step
              )
            );
            setTimeout(() => {
              setCurrentScreen("success");
            }, 400);
          }, 800);
        }
      }
    };

    updateStep();
  };

  const [generatedLink, setGeneratedLink] = useState<string>("https://www.ainager.com/w/company");

  const handleCopyLink = async () => {
    const link = generatedLink;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleComplete = () => {
    // Open the link in a new tab
    window.open(generatedLink, "_blank");
    
    toast({
      title: "Setup Complete!",
      description: "Your AI manager is ready to use",
    });
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {currentScreen === "email" && (
            <motion.div
              key="email"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white rounded-2xl shadow-xl">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-xl mb-4">
                      <Brain className="text-white text-2xl w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">ainager</h1>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="email" className="block text-lg font-medium text-slate-700 mb-3">
                        Enter your Official Email
                      </Label>
                      <Input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError("");
                        }}
                        onKeyPress={(e) => e.key === "Enter" && handleEmailSubmit()}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                        placeholder="your.email@company.com"
                      />
                      {emailError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-600"
                        >
                          {emailError}
                        </motion.div>
                      )}
                    </div>

                    <Button 
                      onClick={handleEmailSubmit}
                      disabled={isLoading || otpSent}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Sending..." : otpSent ? "OTP Sent" : "OK"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentScreen === "otp" && (
            <motion.div
              key="otp"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white rounded-2xl shadow-xl">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-xl mb-4">
                      <Mail className="text-white text-2xl w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Verify Your Email</h2>
                    <p className="text-slate-600">We've sent a verification code to your email</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="otp" className="block text-lg font-medium text-slate-700 mb-3">
                        Enter Verification Code
                      </Label>
                      <Input
                        type="text"
                        id="otp"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setOtp(value);
                        }}
                        onKeyPress={(e) => e.key === "Enter" && handleOTPVerify()}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-lg text-center tracking-widest font-mono"
                        placeholder="000000"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleOTPVerify}
                      disabled={isLoading}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Verifying..." : "Verify"}
                    </Button>

                    <Button 
                      onClick={handleResendOTP}
                      variant="ghost"
                      className="w-full text-blue-500 hover:text-blue-600 font-medium py-2 transition-colors duration-200"
                    >
                      Resend Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentScreen === "progress" && (
            <motion.div
              key="progress"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white rounded-2xl shadow-xl">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-xl mb-4">
                      <Settings className="text-white text-2xl w-8 h-8 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Setting up your AI Manager</h2>
                    <p className="text-slate-600">This will only take a moment...</p>
                    {websiteInfo && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Website Found:</strong> {websiteInfo.title}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {websiteInfo.description}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    {progressSteps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        className={`flex items-center space-x-3 transition-all duration-500 ${
                          step.active || step.completed ? 'opacity-100' : 'opacity-50'
                        }`}
                        initial={{ opacity: 0.5 }}
                        animate={{ 
                          opacity: step.active || step.completed ? 1 : 0.5 
                        }}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          step.completed 
                            ? 'border-emerald-500 bg-emerald-500' 
                            : step.active 
                              ? 'border-blue-500' 
                              : 'border-slate-300'
                        }`}>
                          {step.completed ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : step.active ? (
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          ) : (
                            <div className="w-2 h-2 bg-slate-300 rounded-full" />
                          )}
                        </div>
                        <span className="text-slate-600">{step.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                    <motion.div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-slate-500">{currentProgressText}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentScreen === "success" && (
            <motion.div
              key="success"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white rounded-2xl shadow-xl">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-xl mb-4">
                      <Check className="text-white text-2xl w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Setup Complete!</h2>
                    <p className="text-slate-600">Your AI manager is ready to use</p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <Label className="block text-sm font-medium text-slate-700 mb-2">
                        Your AI Manager Link:
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="text"
                          value={generatedLink}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono"
                        />
                        
                        
                        <Button 
                          onClick={handleCopyLink}
                          size="sm"
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <Info className="text-blue-500 mt-0.5 w-5 h-5" />
                        <div>
                          <p className="text-blue-800 text-sm font-medium mb-1">Usage Instructions</p>
                          <p className="text-blue-700 text-sm">You can use this link in your website and emails to let customers interact with your AI manager.</p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleComplete}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Done
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
