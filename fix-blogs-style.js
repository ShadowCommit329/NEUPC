const fs = require('fs');

let file = fs.readFileSync('app/blogs/BlogsClient.js', 'utf8');

// Use style={{touchAction: 'pan-y'}}
file = file.replace(
  /<motion\.div variants=\{fadeUp\} className="touch-pan-y">/g,
  '<motion.div variants={fadeUp} style={{ touchAction: "pan-y" }}>'
);
file = file.replace(
  /<motion\.div\n *variants=\{staggerContainer\}\n *initial="hidden"\n *animate="show"\n *className="([^"]+)"\n *>/g,
  '<motion.div\n            variants={staggerContainer}\n            initial="hidden"\n            animate="show"\n            className="$1"\n            style={{ touchAction: "pan-y" }}\n          >'
);

fs.writeFileSync('app/blogs/BlogsClient.js', file);
