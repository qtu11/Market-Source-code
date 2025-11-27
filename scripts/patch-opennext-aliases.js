/**
 * Patch script để fix lỗi "Invalid alias name" trong OpenNext Cloudflare
 * Lỗi xảy ra khi esbuild không chấp nhận aliases có dấu "/"
 * 
 * Script này sẽ patch file bundle-server.js của @opennextjs/cloudflare
 * để sửa các aliases có dấu "/" thành format hợp lệ
 */

const fs = require('fs');
const path = require('path');

const bundleServerPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@opennextjs',
  'cloudflare',
  'dist',
  'cli',
  'build',
  'bundle-server.js'
);

if (!fs.existsSync(bundleServerPath)) {
  console.log('⚠️  bundle-server.js not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(bundleServerPath, 'utf8');

// Fix aliases: thay đổi format từ "next/dist/compiled/xxx" thành format hợp lệ
// Thay vì dùng alias với dấu "/", chúng ta sẽ dùng resolve plugin để handle

const originalAlias = `        alias: {
            // Workers have \`fetch\` so the \`node-fetch\` polyfill is not needed
            "next/dist/compiled/node-fetch": path.join(buildOpts.outputDir, "cloudflare-templates/shims/fetch.js"),
            // Workers have builtin Web Sockets
            "next/dist/compiled/ws": path.join(buildOpts.outputDir, "cloudflare-templates/shims/empty.js"),
            // The toolbox optimizer pulls severals MB of dependencies (\`caniuse-lite\`, \`terser\`, \`acorn\`, ...)
            // Drop it to optimize the code size
            // See https://github.com/vercel/next.js/blob/6eb235c/packages/next/src/server/optimize-amp.ts
            "next/dist/compiled/@ampproject/toolbox-optimizer": path.join(buildOpts.outputDir, "cloudflare-templates/shims/throw.js"),
            // The edge runtime is not supported
            "next/dist/compiled/edge-runtime": path.join(buildOpts.outputDir, "cloudflare-templates/shims/empty.js"),
            // \`@next/env\` is used by Next to load environment variables from files.
            // OpenNext inlines the values at build time so this is not needed.
            "@next/env": path.join(buildOpts.outputDir, "cloudflare-templates/shims/env.js"),
        },`;

// Thay thế bằng resolve plugin thay vì alias
const patchedAlias = `        // Aliases được xử lý bằng resolve plugin để tránh lỗi "Invalid alias name"
        // Các aliases có dấu "/" sẽ được resolve trong plugin
        alias: {},`;

if (content.includes(originalAlias)) {
  content = content.replace(originalAlias, patchedAlias);
  
  // Thêm resolve plugin để handle các Next.js internal modules
  // Tìm vị trí sau setWranglerExternal() để insert plugin
  const setWranglerExternalPos = content.indexOf('setWranglerExternal(),');
  if (setWranglerExternalPos !== -1) {
    const resolvePlugin = `
            // Custom resolve plugin để fix aliases có dấu "/"
            {
                name: 'fix-next-aliases',
                setup(build) {
                    build.onResolve({ filter: /^next\\/dist\\/compiled\\/(node-fetch|ws|@ampproject\\/toolbox-optimizer|edge-runtime)$/ }, (args) => {
                        const aliasMap = {
                            'next/dist/compiled/node-fetch': path.join(buildOpts.outputDir, "cloudflare-templates/shims/fetch.js"),
                            'next/dist/compiled/ws': path.join(buildOpts.outputDir, "cloudflare-templates/shims/empty.js"),
                            'next/dist/compiled/@ampproject/toolbox-optimizer': path.join(buildOpts.outputDir, "cloudflare-templates/shims/throw.js"),
                            'next/dist/compiled/edge-runtime': path.join(buildOpts.outputDir, "cloudflare-templates/shims/empty.js"),
                        };
                        return { path: aliasMap[args.path] };
                    });
                },
            },`;
    
    // Insert plugin sau setWranglerExternal()
    const insertPos = content.indexOf('setWranglerExternal(),') + 'setWranglerExternal(),'.length;
    content = content.slice(0, insertPos) + resolvePlugin + content.slice(insertPos);
  }
  
  fs.writeFileSync(bundleServerPath, content, 'utf8');
  console.log('✅ Patched bundle-server.js to fix alias issues');
} else {
  console.log('⚠️  Could not find alias section to patch');
}

