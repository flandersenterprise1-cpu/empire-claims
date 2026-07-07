import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      toastOptions={{
        style: {
          background: "oklch(0.14 0.01 265)",
          color: "oklch(0.94 0.005 65)",
          border: "1px solid oklch(0.22 0.01 265)",
        },
      }}
      {...props}
    />
  );
}
