 'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

const metrics = [
  {
    label: 'Total Revenue',
    value: '$2.4M',
    change: '+24.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'green',
  },
  {
    label: 'Active Leads',
    value: '12,847',
    change: '+18.2%',
    trend: 'up',
    icon: Users,
    color: 'blue',
  },
  {
    label: 'Conversion Rate',
    value: '34.2%',
    change: '+5.4%',
    trend: 'up',
    icon: Target,
    color: 'purple',
  },
  {
    label: 'Avg. Deal Size',
    value: '$18.5K',
    change: '-2.1%',
    trend: 'down',
    icon: TrendingUp,
    color: 'orange',
  },
];

const chartData = [
  { month: 'Jan', leads: 400, revenue: 240 },
  { month: 'Feb', leads: 300, revenue: 139 },
  { month: 'Mar', leads: 550, revenue: 380 },
  { month: 'Apr', leads: 450, revenue: 390 },
  { month: 'May', leads: 600, revenue: 480 },
  { month: 'Jun', leads: 750, revenue: 580 },
];

const colorMap: Record<string, { bg: string; text: string; light: string }> = {
  green: { bg: 'bg-green-500/10', text: 'text-green-400', light: 'bg-green-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', light: 'bg-blue-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', light: 'bg-purple-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', light: 'bg-orange-500/20' },
};

export function Analytics() {
  const router = useRouter();

  const handleViewReport = () => {
    router.push('/analytics');
  };

  return (
    <section id="analytics" className="relative py-24 lg:py-32">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 section-padding">
        <div className="container-wide">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
            >
              Real-Time <span className="text-gradient">Analytics</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              Track every metric that matters. Make data-driven decisions with confidence.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Metrics Cards */}
            <div className="lg:col-span-1 space-y-4">
              {metrics.map((metric, index) => {
                const colors = colorMap[metric.color as keyof typeof colorMap]!;
                const Icon = metric.icon;
                const TrendIcon = metric.trend === 'up' ? ArrowUpRight : ArrowDownRight;

                return (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{metric.label}</p>
                          <p className="text-2xl font-bold text-white">{metric.value}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${metric.trend === 'up' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <TrendIcon className={`w-3 h-3 ${metric.trend === 'up' ? 'text-green-400' : 'text-red-400'}`} />
                        <span className={`text-xs font-medium ${metric.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                          {metric.change}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Main Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2 p-6 lg:p-8 rounded-3xl bg-white/[0.02] border border-white/5"
            >
              {/* Chart Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Revenue & Leads</h3>
                  <p className="text-sm text-muted-foreground">Last 6 months performance</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-muted-foreground">Leads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-sm text-muted-foreground">Revenue</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="relative h-64 lg:h-80">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground pr-2">
                  <span>1000</span>
                  <span>750</span>
                  <span>500</span>
                  <span>250</span>
                  <span>0</span>
                </div>

                {/* Chart Area */}
                <div className="absolute left-10 right-0 top-0 bottom-0">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="border-t border-white/5" />
                    ))}
                  </div>

                  {/* Bars */}
                  <div className="absolute inset-0 flex items-end justify-between gap-2 lg:gap-4">
                    {chartData.map((data, i) => (
                      <div key={i} className="flex-1 flex items-end gap-1">
                        {/* Leads Bar */}
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${(data.leads / 1000) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className="flex-1 bg-gradient-to-t from-blue-500/80 to-blue-400/60 rounded-t-sm hover:from-blue-400 hover:to-blue-300 transition-colors cursor-pointer group relative"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded text-xs text-white whitespace-nowrap border border-white/10">
                            {data.leads} leads
                          </div>
                        </motion.div>
                        {/* Revenue Bar */}
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${(data.revenue / 1000) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: i * 0.1 + 0.05 }}
                          className="flex-1 bg-gradient-to-t from-purple-500/80 to-purple-400/60 rounded-t-sm hover:from-purple-400 hover:to-purple-300 transition-colors cursor-pointer group relative"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded text-xs text-white whitespace-nowrap border border-white/10">
                            ${data.revenue}k
                          </div>
                        </motion.div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between mt-4 pl-10">
                {chartData.map((data, i) => (
                  <span key={i} className="text-xs text-muted-foreground flex-1 text-center">
                    {data.month}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Additional Insights */}
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            {[
              { 
                icon: BarChart3, 
                title: 'Pipeline Health', 
                value: '92%',
                description: 'Strong pipeline with consistent flow',
                color: 'green'
              },
              { 
                icon: PieChart, 
                title: 'Channel Mix', 
                value: '8 Sources',
                description: 'Diversified lead acquisition',
                color: 'blue'
              },
              { 
                icon: Activity, 
                title: 'Engagement Score', 
                value: '87/100',
                description: 'Above industry average',
                color: 'purple'
              },
            ].map((item, index) => {
              const colors = colorMap[item.color as keyof typeof colorMap]!;
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.title}</p>
                      <p className="text-xl font-bold text-white">{item.value}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center mt-12"
          >
            <button
              onClick={handleViewReport}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              View Full Analytics Dashboard
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
