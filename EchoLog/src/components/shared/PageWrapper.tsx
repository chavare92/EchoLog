import { motion } from "framer-motion";

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.02,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

export function PageWrapper({ children, title, description, actions }: PageWrapperProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {(title ?? actions) && (
        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight leading-tight">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-[hsl(var(--foreground-muted))] mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0 sm:mt-0.5">{actions}</div>
          )}
        </motion.div>
      )}
      {children}
    </motion.div>
  );
}
