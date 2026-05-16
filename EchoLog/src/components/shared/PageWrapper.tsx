import { motion } from "framer-motion";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function PageWrapper({ children, title, actions }: PageWrapperProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {(title ?? actions) && (
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          {title && (
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">{title}</h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </motion.div>
      )}
      {children}
    </motion.div>
  );
}
