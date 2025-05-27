import { spawn } from 'child_process';
import svelte from 'rollup-plugin-svelte';
import dev from 'rollup-plugin-dev';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: 'public/build/bundle.js'
	},
	plugins: [
		svelte({
			compilerOptions: {
				dev: !production
			}
		}),
		css({ output: 'bundle.css' }),
		resolve({
			browser: true,
			dedupe: ['svelte'],
			exportConditions: ['svelte']
		}),
		commonjs(),
		babel({
			extensions: ['.js', '.mjs', '.html', '.svelte'],
			babelHelpers: 'bundled',
			presets: [
				['@babel/preset-env', {
					targets: { browsers: ['KaiOS >= 2.5', 'ie 11'] },
					useBuiltIns: 'entry',
					corejs: 3
				}]
			]
		}),
		!production && dev({
			dirs: ['public'],
			spa: 'public/index.html',
			proxy: [
				{
					from: '/api',
					to: 'https://3.235.250.245:3003'
				}
			],
			host: '0.0.0.0'
		}),
		!production && livereload('public'),
		production && terser()
	],
	watch: {
		clearScreen: false
	}
};
