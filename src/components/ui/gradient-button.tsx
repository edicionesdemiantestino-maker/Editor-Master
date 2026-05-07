"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

type GradientButtonProps = HTMLMotionProps<"button">;

export function GradientButton({ children, className = "", ...props }: GradientButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className={[
        "relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-purple-500/20",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </motion.button>
  );
}
