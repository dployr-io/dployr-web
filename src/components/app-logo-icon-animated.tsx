import AppLogoIcon from "@/components/app-logo-icon";

export default function AnimatedLogo() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <style>{`
        @keyframes shimmerSpinZoom {
          0% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.15) rotate(90deg);
          }
          50% {
            transform: scale(1) rotate(180deg);
          }
          75% {
            transform: scale(1.15) rotate(270deg);
          }
          100% {
            transform: scale(1) rotate(360deg);
          }
        }

        @keyframes shimmerWave {
          0% {
            background-position: -200% -200%;
          }
          100% {
            background-position: 200% 200%;
          }
        }

        .animated-logo-wrapper {
          position: relative;
          display: inline-block;
        }

        .animated-logo-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 0.6) 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 200% 200%;
          animation: shimmerWave 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          border-radius: 50%;
          pointer-events: none;
          mask: var(--logo-mask);
          -webkit-mask: var(--logo-mask);
        }

        .animated-logo {
          animation: shimmerSpinZoom 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          position: relative;
          z-index: 1;
        }
      `}</style>

      <div className="animated-logo-wrapper">
        <AppLogoIcon className="animated-logo size-16 fill-current text-slate-400" />
      </div>
    </div>
  );
}
