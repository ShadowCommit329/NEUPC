/**
 * @file Wave
 * @module Wave
 */

function Wave() {
  return (
    <div className="relative -mt-1">
      <svg
        className="h-10 w-full rotate-180 sm:h-16 md:h-20 lg:h-24"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              className="text-primary-500/10"
              stopColor="currentColor"
            />
            <stop
              offset="50%"
              className="text-secondary-500/15"
              stopColor="currentColor"
            />
            <stop
              offset="100%"
              className="text-primary-500/10"
              stopColor="currentColor"
            />
          </linearGradient>
          <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(8,131,149,0.05)" />
            <stop offset="50%" stopColor="rgba(122,178,178,0.08)" />
            <stop offset="100%" stopColor="rgba(8,131,149,0.05)" />
          </linearGradient>
        </defs>
        <path
          d="M0,64 C200,90 400,90 600,64 C800,38 1000,38 1200,64 L1200,120 L0,120 Z"
          fill="url(#waveGradient2)"
        />
        <path
          d="M0,80 C300,55 500,55 800,80 C1000,100 1100,100 1200,80 L1200,120 L0,120 Z"
          fill="url(#waveGradient3)"
        />
        <path
          d="M0,90 C400,70 600,70 1200,90 L1200,120 L0,120 Z"
          fill="rgba(0,0,0,0.15)"
        />
      </svg>
    </div>
  );
}

export default Wave;
