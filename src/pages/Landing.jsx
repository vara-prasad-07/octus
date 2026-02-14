import { ArrowRight, Brain, Zap, Users, TrendingUp, Shield, Target } from 'lucide-react';
import HeroSection from '../components/ui/HeroSection';

export default function Landing() {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced machine learning algorithms analyze your project data to identify risks, bottlenecks, and optimization opportunities in real-time.'
    },
    {
      icon: Zap,
      title: 'Velocity-Based Distribution',
      description: 'Intelligent work allocation based on team member velocity and capacity. Assign tasks to the right people for faster completion.'
    },
    {
      icon: Shield,
      title: 'Risk Scoring Engine',
      description: 'Multi-factor risk assessment considering deadlines, complexity, dependencies, workload, and velocity trends.'
    },
    {
      icon: Users,
      title: 'Team Workload Optimization',
      description: 'Detect overloaded team members and get AI recommendations to redistribute work effectively across your team.'
    },
    {
      icon: TrendingUp,
      title: 'Predictive Analytics',
      description: 'Forecast project completion dates, identify potential delays, and get proactive recommendations to stay on track.'
    },
    {
      icon: Target,
      title: 'Real-Time Insights',
      description: 'Live dashboard with KPIs, velocity metrics, risk breakdowns, and actionable insights powered by Firebase.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-gradient-to-b from-[#1a1d18] to-[#0a0f1e]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#f8f7f5] mb-4">
              Powerful Features for Modern Teams
            </h2>
            <p className="text-xl text-[#c8b4a0] max-w-3xl mx-auto">
              Everything you need to plan, execute, and optimize your projects with AI-driven intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-[#2a2e26]/40 to-[#1a1d18]/40 backdrop-blur-xl border border-[#544237]/30 rounded-2xl p-8 hover:border-[#8a7060]/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-[#6b5545]/20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(42, 46, 38, 0.4) 0%, rgba(26, 29, 24, 0.4) 100%)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* Glassmorphic shine effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#8a7060] to-[#6b5545] rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-[#8a7060]/50 transition-shadow duration-300">
                      <Icon className="w-8 h-8 text-[#f8f7f5]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#f8f7f5] mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-[#c8b4a0] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-[#0a0f1e] to-[#1a1d18]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[#f8f7f5] mb-4">
              How Octus Works
            </h2>
            <p className="text-xl text-[#c8b4a0]">
              Simple workflow, powerful results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Import Data', desc: 'Upload your project tasks via CSV or Excel' },
              { step: '02', title: 'AI Analysis', desc: 'Our engine analyzes risks, velocity, and workload' },
              { step: '03', title: 'Get Insights', desc: 'Receive actionable recommendations and predictions' },
              { step: '04', title: 'Optimize', desc: 'Apply suggestions and track improvements in real-time' }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div 
                  className="bg-gradient-to-br from-[#2a2e26]/40 to-[#1a1d18]/40 backdrop-blur-xl border border-[#544237]/30 rounded-2xl p-6 text-center hover:border-[#8a7060]/50 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-[#6b5545]/20"
                  style={{
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="text-6xl font-bold bg-gradient-to-r from-[#a89080] to-[#8a7060] bg-clip-text text-transparent mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-[#f8f7f5] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[#c8b4a0]">
                    {item.desc}
                  </p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-[#8a7060]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-[#1a1d18] to-[#0a0f1e]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[#f8f7f5] mb-6">
            Ready to Transform Your Project Management?
          </h2>
          <p className="text-xl text-[#c8b4a0] mb-10">
            Join teams using AI to deliver projects faster and more effectively
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/login"
              className="group relative px-10 py-5 bg-gradient-to-r from-[#8a7060] to-[#6b5545] text-[#f8f7f5] rounded-full font-semibold text-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#8a7060]/50 hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#a89080] to-[#8a7060] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
            <a
              href="#features"
              className="px-10 py-5 bg-[#2a2e26]/40 backdrop-blur-xl text-[#f8f7f5] rounded-full font-semibold text-lg border-2 border-[#544237]/50 hover:border-[#8a7060] hover:bg-[#2a2e26]/60 transition-all duration-300 hover:shadow-xl hover:shadow-[#6b5545]/20"
              style={{ backdropFilter: 'blur(20px)' }}
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-[#1a1d18] border-t border-[#544237]/30">
        <div className="max-w-7xl mx-auto text-center text-[#a89080]">
          <p>&copy; 2026 Octus. AI-Powered Project Management Platform.</p>
        </div>
      </footer>
    </div>
  );
}
