import { motion } from "framer-motion";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

export const itemVariants = {
  hidden: { opacity: 1, y: 0 },
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
        <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h1>
          )}
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </motion.div>
      )}
      {children}
    </motion.div>
  );
}
