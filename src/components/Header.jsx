import React from "react";
import { Shield } from "lucide-react";

export default function Header() {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-purple-400" />
        <span className="font-bold">Emergency Vault</span>
      </div>
    </div>
  );
}
