const fs = require('fs');

let file = fs.readFileSync('app/blogs/BlogsClient.js', 'utf8');

// Replace GridCard motion.div
file = file.replace(
  '<motion.div variants={fadeUp} className="touch-pan-y" whileHover={cardHover}>',
  '<motion.div variants={fadeUp} className="touch-pan-y">'
);

// Add hover to GridCard Link
file = file.replace(
  'className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-colors duration-300 hover:border-white/15 hover:shadow-xl hover:shadow-black/30"',
  'className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-xl hover:shadow-black/30"'
);

// Replace ListCard motion.div
file = file.replace(
  '<motion.div\n      variants={fadeUp} className="touch-pan-y"\n      whileHover={{ y: -2, transition: { duration: 0.2 } }}\n    >',
  '<motion.div variants={fadeUp} className="touch-pan-y">'
);

// Add hover to ListCard Link
file = file.replace(
  'className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6 transition-colors duration-300 hover:border-white/15 hover:bg-white/5 sm:flex-row"',
  'className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/5 sm:flex-row"'
);

fs.writeFileSync('app/blogs/BlogsClient.js', file);
