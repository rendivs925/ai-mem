"use strict";var Kt=Object.create;var j=Object.defineProperty;var Jt=Object.getOwnPropertyDescriptor;var zt=Object.getOwnPropertyNames;var Qt=Object.getPrototypeOf,Zt=Object.prototype.hasOwnProperty;var es=(r,e)=>{for(var t in e)j(r,t,{get:e[t],enumerable:!0})},Ne=(r,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of zt(e))!Zt.call(r,n)&&n!==t&&j(r,n,{get:()=>e[n],enumerable:!(s=Jt(e,n))||s.enumerable});return r};var C=(r,e,t)=>(t=r!=null?Kt(Qt(r)):{},Ne(e||!r||!r.__esModule?j(t,"default",{value:r,enumerable:!0}):t,r)),ts=r=>Ne(j({},"__esModule",{value:!0}),r);var Fs={};es(Fs,{generateContext:()=>Ce});module.exports=ts(Fs);var Wt=C(require("path"),1),Ht=require("os"),qt=require("fs");var $e=require("bun:sqlite");var h=require("path"),F=require("os"),I=require("fs");var xe=require("url");var M=require("fs"),x=require("path"),Le=require("os"),ce=(o=>(o[o.DEBUG=0]="DEBUG",o[o.INFO=1]="INFO",o[o.WARN=2]="WARN",o[o.ERROR=3]="ERROR",o[o.SILENT=4]="SILENT",o))(ce||{}),De=(0,x.join)((0,Le.homedir)(),".ai-mem"),de=class{level=null;useColor;logFilePath=null;logFileInitialized=!1;constructor(){this.useColor=process.stdout.isTTY??!1}ensureLogFileInitialized(){if(!this.logFileInitialized){this.logFileInitialized=!0;try{let e=(0,x.join)(De,"logs");(0,M.existsSync)(e)||(0,M.mkdirSync)(e,{recursive:!0});let t=new Date().toISOString().split("T")[0];this.logFilePath=(0,x.join)(e,`ai-mem-${t}.log`)}catch(e){console.error("[LOGGER] Failed to initialize log file:",e),this.logFilePath=null}}}getLevel(){if(this.level===null)try{let e=(0,x.join)(De,"settings.json");if((0,M.existsSync)(e)){let t=(0,M.readFileSync)(e,"utf-8"),n=(JSON.parse(t).AI_MEM_LOG_LEVEL||"INFO").toUpperCase();this.level=ce[n]??1}else this.level=1}catch{this.level=1}return this.level}correlationId(e,t){return`obs-${e}-${t}`}sessionId(e){return`session-${e}`}formatData(e){if(e==null)return"";if(typeof e=="string")return e;if(typeof e=="number"||typeof e=="boolean")return e.toString();if(typeof e=="object"){if(e instanceof Error)return this.getLevel()===0?`${e.message}
${e.stack}`:e.message;if(Array.isArray(e))return`[${e.length} items]`;let t=Object.keys(e);return t.length===0?"{}":t.length<=3?JSON.stringify(e):`{${t.length} keys: ${t.slice(0,3).join(", ")}...}`}return String(e)}formatTool(e,t){if(!t)return e;let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{s=t}if(e==="Bash"&&s.command)return`${e}(${s.command})`;if(s.file_path)return`${e}(${s.file_path})`;if(s.notebook_path)return`${e}(${s.notebook_path})`;if(e==="Glob"&&s.pattern)return`${e}(${s.pattern})`;if(e==="Grep"&&s.pattern)return`${e}(${s.pattern})`;if(s.url)return`${e}(${s.url})`;if(s.query)return`${e}(${s.query})`;if(e==="Task"){if(s.subagent_type)return`${e}(${s.subagent_type})`;if(s.description)return`${e}(${s.description})`}return e==="Skill"&&s.skill?`${e}(${s.skill})`:e==="LSP"&&s.operation?`${e}(${s.operation})`:e}formatTimestamp(e){let t=e.getFullYear(),s=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0"),a=String(e.getSeconds()).padStart(2,"0"),c=String(e.getMilliseconds()).padStart(3,"0");return`${t}-${s}-${n} ${o}:${i}:${a}.${c}`}log(e,t,s,n,o){if(e<this.getLevel())return;this.ensureLogFileInitialized();let i=this.formatTimestamp(new Date),a=ce[e].padEnd(5),c=t.padEnd(6),d="";n?.correlationId?d=`[${n.correlationId}] `:n?.sessionId&&(d=`[session-${n.sessionId}] `);let l="";o!=null&&(o instanceof Error?l=this.getLevel()===0?`
${o.message}
${o.stack}`:` ${o.message}`:this.getLevel()===0&&typeof o=="object"?l=`
`+JSON.stringify(o,null,2):l=" "+this.formatData(o));let p="";if(n){let{sessionId:T,memorySessionId:b,correlationId:S,...E}=n;Object.keys(E).length>0&&(p=` {${Object.entries(E).map(([g,y])=>`${g}=${y}`).join(", ")}}`)}let f=`[${i}] [${a}] [${c}] ${d}${s}${p}${l}`;if(this.logFilePath)try{(0,M.appendFileSync)(this.logFilePath,f+`
`,"utf8")}catch(T){process.stderr.write(`[LOGGER] Failed to write to log file: ${T}
`)}else process.stderr.write(f+`
`)}debug(e,t,s,n){this.log(0,e,t,s,n)}info(e,t,s,n){this.log(1,e,t,s,n)}warn(e,t,s,n){this.log(2,e,t,s,n)}error(e,t,s,n){this.log(3,e,t,s,n)}dataIn(e,t,s,n){this.info(e,`\u2192 ${t}`,s,n)}dataOut(e,t,s,n){this.info(e,`\u2190 ${t}`,s,n)}success(e,t,s,n){this.info(e,`\u2713 ${t}`,s,n)}failure(e,t,s,n){this.error(e,`\u2717 ${t}`,s,n)}timing(e,t,s,n){this.info(e,`\u23F1 ${t}`,n,{duration:`${s}ms`})}happyPathError(e,t,s,n,o=""){let d=((new Error().stack||"").split(`
`)[2]||"").match(/at\s+(?:.*\s+)?\(?([^:]+):(\d+):(\d+)\)?/),l=d?`${d[1].split("/").pop()}:${d[2]}`:"unknown",p={...s,location:l};return this.warn(e,`[HAPPY-PATH] ${t}`,p,n),o}},u=new de;var cs={};function ss(){return typeof __dirname<"u"?__dirname:(0,h.dirname)((0,xe.fileURLToPath)(cs.url))}var rs=ss();function ns(){if(process.env.AI_MEM_DATA_DIR)return process.env.AI_MEM_DATA_DIR;let r=(0,h.join)((0,F.homedir)(),".ai-mem"),e=(0,h.join)(r,"settings.json");try{if((0,I.existsSync)(e)){let{readFileSync:t}=require("fs"),s=JSON.parse(t(e,"utf-8")),n=s.env??s;if(n.AI_MEM_DATA_DIR)return n.AI_MEM_DATA_DIR}}catch{}return r}var v=ns(),D=process.env.CLAUDE_CONFIG_DIR||(0,h.join)((0,F.homedir)(),".claude"),Hs=(0,h.join)(D,"plugins","marketplaces","thedotmack"),qs=(0,h.join)(v,"archives"),Ys=(0,h.join)(v,"logs"),Vs=(0,h.join)(v,"trash"),Ks=(0,h.join)(v,"backups"),Js=(0,h.join)(v,"modes"),zs=(0,h.join)(v,"settings.json"),A=(0,h.join)(v,"ai-mem.db"),Qs=(0,h.join)(v,"vector-db"),os=[(0,h.join)(v,"claude-mem.db"),(0,h.join)((0,F.homedir)(),".claude-mem","claude-mem.db")];function is(r){return[`${r}-wal`,`${r}-shm`]}function as(r,e){let t=(0,h.dirname)(r),s=(0,h.dirname)(e),n=[r,...is(r)];for(let o of n){if(!(0,I.existsSync)(o))continue;let i=(0,h.join)(s,(0,h.basename)(o).replace((0,h.basename)(r),(0,h.basename)(e)));if(t===s){(0,I.renameSync)(o,i);continue}(0,I.copyFileSync)(o,i)}}function we(){if((0,I.existsSync)(A))return A;le(v);for(let r of os)if((0,I.existsSync)(r))try{return as(r,A),u.info("DB","Migrated legacy database to canonical ai-mem path",{from:r,to:A}),A}catch(e){u.warn("DB","Failed to migrate legacy database, continuing with canonical path",{from:r,to:A},e)}return A}var Zs=(0,h.join)(v,"observer-sessions"),er=(0,h.join)(D,"settings.json"),tr=(0,h.join)(D,"commands"),sr=(0,h.join)(D,"CLAUDE.md");function le(r){(0,I.mkdirSync)(r,{recursive:!0})}function ke(){return(0,h.join)(rs,"..")}var Ue=require("crypto");var ds=3e4;function N(r,e,t){return(0,Ue.createHash)("sha256").update((r||"")+(e||"")+(t||"")).digest("hex").slice(0,16)}function B(r,e,t){let s=t-ds;return r.prepare("SELECT id, created_at_epoch FROM observations WHERE content_hash = ? AND created_at_epoch > ?").get(e,s)}var X=class{db;constructor(e=A){e!==":memory:"&&(le(v),e=we()),this.db=new $e.Database(e),this.db.run("PRAGMA journal_mode = WAL"),this.db.run("PRAGMA synchronous = NORMAL"),this.db.run("PRAGMA foreign_keys = ON"),this.db.run("PRAGMA busy_timeout = 5000"),this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.repairSessionIdColumnRename(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addObservationContentHashColumn(),this.addSessionCustomTitleColumn()}initializeSchema(){this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id INTEGER PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      )
    `),this.db.run(`
      CREATE TABLE IF NOT EXISTS sdk_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT UNIQUE NOT NULL,
        memory_session_id TEXT UNIQUE,
        project TEXT NOT NULL,
        user_prompt TEXT,
        started_at TEXT NOT NULL,
        started_at_epoch INTEGER NOT NULL,
        completed_at TEXT,
        completed_at_epoch INTEGER,
        status TEXT CHECK(status IN ('active', 'completed', 'failed')) NOT NULL DEFAULT 'active'
      );

      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id ON sdk_sessions(content_session_id);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id ON sdk_sessions(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project ON sdk_sessions(project);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status ON sdk_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started ON sdk_sessions(started_at_epoch DESC);

      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project);
      CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
      CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at_epoch DESC);

      CREATE TABLE IF NOT EXISTS session_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT UNIQUE NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(4,new Date().toISOString())}ensureWorkerPortColumn(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(s=>s.name==="worker_port")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN worker_port INTEGER"),u.debug("DB","Added worker_port column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(5,new Date().toISOString())}ensurePromptTrackingColumns(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(a=>a.name==="prompt_counter")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN prompt_counter INTEGER DEFAULT 0"),u.debug("DB","Added prompt_counter column to sdk_sessions table")),this.db.query("PRAGMA table_info(observations)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE observations ADD COLUMN prompt_number INTEGER"),u.debug("DB","Added prompt_number column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN prompt_number INTEGER"),u.debug("DB","Added prompt_number column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(6,new Date().toISOString())}removeSessionSummariesUniqueConstraint(){if(!this.db.query("PRAGMA index_list(session_summaries)").all().some(s=>s.unique===1)){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString());return}u.debug("DB","Removing UNIQUE constraint from session_summaries.memory_session_id"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
      CREATE TABLE session_summaries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, created_at, created_at_epoch
      FROM session_summaries
    `),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString()),u.debug("DB","Successfully removed UNIQUE constraint from session_summaries.memory_session_id")}addObservationHierarchicalFields(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(8))return;if(this.db.query("PRAGMA table_info(observations)").all().some(n=>n.name==="title")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString());return}u.debug("DB","Adding hierarchical fields to observations table"),this.db.run(`
      ALTER TABLE observations ADD COLUMN title TEXT;
      ALTER TABLE observations ADD COLUMN subtitle TEXT;
      ALTER TABLE observations ADD COLUMN facts TEXT;
      ALTER TABLE observations ADD COLUMN narrative TEXT;
      ALTER TABLE observations ADD COLUMN concepts TEXT;
      ALTER TABLE observations ADD COLUMN files_read TEXT;
      ALTER TABLE observations ADD COLUMN files_modified TEXT;
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString()),u.debug("DB","Successfully added hierarchical fields to observations table")}makeObservationsTextNullable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(9))return;let s=this.db.query("PRAGMA table_info(observations)").all().find(n=>n.name==="text");if(!s||s.notnull===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString());return}u.debug("DB","Making observations.text nullable"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
      CREATE TABLE observations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        facts TEXT,
        narrative TEXT,
        concepts TEXT,
        files_read TEXT,
        files_modified TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             created_at, created_at_epoch
      FROM observations
    `),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString()),u.debug("DB","Successfully made observations.text nullable")}createUserPromptsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(10))return;if(this.db.query("PRAGMA table_info(user_prompts)").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString());return}u.debug("DB","Creating user_prompts table with FTS5 support"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
      CREATE TABLE user_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT NOT NULL,
        prompt_number INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(content_session_id) REFERENCES sdk_sessions(content_session_id) ON DELETE CASCADE
      );

      CREATE INDEX idx_user_prompts_claude_session ON user_prompts(content_session_id);
      CREATE INDEX idx_user_prompts_created ON user_prompts(created_at_epoch DESC);
      CREATE INDEX idx_user_prompts_prompt_number ON user_prompts(prompt_number);
      CREATE INDEX idx_user_prompts_lookup ON user_prompts(content_session_id, prompt_number);
    `);try{this.db.run(`
        CREATE VIRTUAL TABLE user_prompts_fts USING fts5(
          prompt_text,
          content='user_prompts',
          content_rowid='id'
        );
      `),this.db.run(`
        CREATE TRIGGER user_prompts_ai AFTER INSERT ON user_prompts BEGIN
          INSERT INTO user_prompts_fts(rowid, prompt_text)
          VALUES (new.id, new.prompt_text);
        END;

        CREATE TRIGGER user_prompts_ad AFTER DELETE ON user_prompts BEGIN
          INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
          VALUES('delete', old.id, old.prompt_text);
        END;

        CREATE TRIGGER user_prompts_au AFTER UPDATE ON user_prompts BEGIN
          INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
          VALUES('delete', old.id, old.prompt_text);
          INSERT INTO user_prompts_fts(rowid, prompt_text)
          VALUES (new.id, new.prompt_text);
        END;
      `)}catch(s){u.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},s)}this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),u.debug("DB","Successfully created user_prompts table")}ensureDiscoveryTokensColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(11))return;this.db.query("PRAGMA table_info(observations)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE observations ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),u.debug("DB","Added discovery_tokens column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),u.debug("DB","Added discovery_tokens column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(11,new Date().toISOString())}createPendingMessagesTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(16))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString());return}u.debug("DB","Creating pending_messages table"),this.db.run(`
      CREATE TABLE pending_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id INTEGER NOT NULL,
        content_session_id TEXT NOT NULL,
        message_type TEXT NOT NULL CHECK(message_type IN ('observation', 'summarize')),
        tool_name TEXT,
        tool_input TEXT,
        tool_response TEXT,
        cwd TEXT,
        last_user_message TEXT,
        last_assistant_message TEXT,
        prompt_number INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'processed', 'failed')),
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at_epoch INTEGER NOT NULL,
        started_processing_at_epoch INTEGER,
        completed_at_epoch INTEGER,
        FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),u.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;u.debug("DB","Checking session ID columns for semantic clarity rename");let t=0,s=(n,o,i)=>{let a=this.db.query(`PRAGMA table_info(${n})`).all(),c=a.some(l=>l.name===o);return a.some(l=>l.name===i)?!1:c?(this.db.run(`ALTER TABLE ${n} RENAME COLUMN ${o} TO ${i}`),u.debug("DB",`Renamed ${n}.${o} to ${i}`),!0):(u.warn("DB",`Column ${o} not found in ${n}, skipping rename`),!1)};s("sdk_sessions","claude_session_id","content_session_id")&&t++,s("sdk_sessions","sdk_session_id","memory_session_id")&&t++,s("pending_messages","claude_session_id","content_session_id")&&t++,s("observations","sdk_session_id","memory_session_id")&&t++,s("session_summaries","sdk_session_id","memory_session_id")&&t++,s("user_prompts","claude_session_id","content_session_id")&&t++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),t>0?u.debug("DB",`Successfully renamed ${t} session ID columns`):u.debug("DB","No session ID column renames needed (already up to date)")}repairSessionIdColumnRename(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(19)||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(19,new Date().toISOString())}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),u.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(!this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21)){u.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
        CREATE TABLE observations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memory_session_id TEXT NOT NULL,
          project TEXT NOT NULL,
          text TEXT,
          type TEXT NOT NULL,
          title TEXT,
          subtitle TEXT,
          facts TEXT,
          narrative TEXT,
          concepts TEXT,
          files_read TEXT,
          files_modified TEXT,
          prompt_number INTEGER,
          discovery_tokens INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          created_at_epoch INTEGER NOT NULL,
          FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `),this.db.run(`
        INSERT INTO observations_new
        SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
               narrative, concepts, files_read, files_modified, prompt_number,
               discovery_tokens, created_at, created_at_epoch
        FROM observations
      `),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(`
        CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
        CREATE INDEX idx_observations_project ON observations(project);
        CREATE INDEX idx_observations_type ON observations(type);
        CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
      `),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run(`
          CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
            INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
            VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
          END;

          CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
            INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
            VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
          END;

          CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
            INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
            VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
            INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
            VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
          END;
        `),this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
        CREATE TABLE session_summaries_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memory_session_id TEXT NOT NULL,
          project TEXT NOT NULL,
          request TEXT,
          investigated TEXT,
          learned TEXT,
          completed TEXT,
          next_steps TEXT,
          files_read TEXT,
          files_edited TEXT,
          notes TEXT,
          prompt_number INTEGER,
          discovery_tokens INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          created_at_epoch INTEGER NOT NULL,
          FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `),this.db.run(`
        INSERT INTO session_summaries_new
        SELECT id, memory_session_id, project, request, investigated, learned,
               completed, next_steps, files_read, files_edited, notes,
               prompt_number, discovery_tokens, created_at, created_at_epoch
        FROM session_summaries
      `),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ai"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ad"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_au"),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(`
        CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
        CREATE INDEX idx_session_summaries_project ON session_summaries(project);
        CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
      `),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_summaries_fts'").all().length>0&&this.db.run(`
          CREATE TRIGGER IF NOT EXISTS session_summaries_ai AFTER INSERT ON session_summaries BEGIN
            INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
            VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
          END;

          CREATE TRIGGER IF NOT EXISTS session_summaries_ad AFTER DELETE ON session_summaries BEGIN
            INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
            VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
          END;

          CREATE TRIGGER IF NOT EXISTS session_summaries_au AFTER UPDATE ON session_summaries BEGIN
            INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
            VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
            INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
            VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
          END;
        `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),u.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(t){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),t}}}addObservationContentHashColumn(){if(this.db.query("PRAGMA table_info(observations)").all().some(s=>s.name==="content_hash")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString());return}this.db.run("ALTER TABLE observations ADD COLUMN content_hash TEXT"),this.db.run("UPDATE observations SET content_hash = substr(hex(randomblob(8)), 1, 16) WHERE content_hash IS NULL"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch)"),u.debug("DB","Added content_hash column to observations table with backfill and index"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}addSessionCustomTitleColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23))return;this.db.query("PRAGMA table_info(sdk_sessions)").all().some(n=>n.name==="custom_title")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN custom_title TEXT"),u.debug("DB","Added custom_title column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString())}updateMemorySessionId(e,t){this.db.prepare(`
      UPDATE sdk_sessions
      SET memory_session_id = ?
      WHERE id = ?
    `).run(t,e)}ensureMemorySessionIdRegistered(e,t){let s=this.db.prepare(`
      SELECT id, memory_session_id FROM sdk_sessions WHERE id = ?
    `).get(e);if(!s)throw new Error(`Session ${e} not found in sdk_sessions`);s.memory_session_id!==t&&(this.db.prepare(`
        UPDATE sdk_sessions SET memory_session_id = ? WHERE id = ?
      `).run(t,e),u.info("DB","Registered memory_session_id before storage (FK fix)",{sessionDbId:e,oldId:s.memory_session_id,newId:t}))}getRecentSummaries(e,t=10){return this.db.prepare(`
      SELECT
        request, investigated, learned, completed, next_steps,
        files_read, files_edited, notes, prompt_number, created_at
      FROM session_summaries
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getRecentSummariesWithSessionInfo(e,t=3){return this.db.prepare(`
      SELECT
        memory_session_id, request, learned, completed, next_steps,
        prompt_number, created_at
      FROM session_summaries
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getRecentObservations(e,t=20){return this.db.prepare(`
      SELECT type, text, prompt_number, created_at
      FROM observations
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getAllRecentObservations(e=100){return this.db.prepare(`
      SELECT id, type, title, subtitle, text, project, prompt_number, created_at, created_at_epoch
      FROM observations
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllRecentSummaries(e=50){return this.db.prepare(`
      SELECT id, request, investigated, learned, completed, next_steps,
             files_read, files_edited, notes, project, prompt_number,
             created_at, created_at_epoch
      FROM session_summaries
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllRecentUserPrompts(e=100){return this.db.prepare(`
      SELECT
        up.id,
        up.content_session_id,
        s.project,
        up.prompt_number,
        up.prompt_text,
        up.created_at,
        up.created_at_epoch
      FROM user_prompts up
      LEFT JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      ORDER BY up.created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllProjects(){return this.db.prepare(`
      SELECT DISTINCT project
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
      ORDER BY project ASC
    `).all().map(s=>s.project)}getLatestUserPrompt(e){return this.db.prepare(`
      SELECT
        up.*,
        s.memory_session_id,
        s.project
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.content_session_id = ?
      ORDER BY up.created_at_epoch DESC
      LIMIT 1
    `).get(e)}getRecentSessionsWithStatus(e,t=3){return this.db.prepare(`
      SELECT * FROM (
        SELECT
          s.memory_session_id,
          s.status,
          s.started_at,
          s.started_at_epoch,
          s.user_prompt,
          CASE WHEN sum.memory_session_id IS NOT NULL THEN 1 ELSE 0 END as has_summary
        FROM sdk_sessions s
        LEFT JOIN session_summaries sum ON s.memory_session_id = sum.memory_session_id
        WHERE s.project = ? AND s.memory_session_id IS NOT NULL
        GROUP BY s.memory_session_id
        ORDER BY s.started_at_epoch DESC
        LIMIT ?
      )
      ORDER BY started_at_epoch ASC
    `).all(e,t)}getObservationsForSession(e){return this.db.prepare(`
      SELECT title, subtitle, type, prompt_number
      FROM observations
      WHERE memory_session_id = ?
      ORDER BY created_at_epoch ASC
    `).all(e)}getObservationById(e){return this.db.prepare(`
      SELECT *
      FROM observations
      WHERE id = ?
    `).get(e)||null}updateObservation(e,t){let s=this.getObservationById(e);if(!s)return!1;let n=[],o=[];if(t.project!==void 0&&(n.push("project = ?"),o.push(t.project)),t.type!==void 0&&(n.push("type = ?"),o.push(t.type)),t.title!==void 0&&(n.push("title = ?"),o.push(t.title)),t.subtitle!==void 0&&(n.push("subtitle = ?"),o.push(t.subtitle)),t.facts!==void 0&&(n.push("facts = ?"),o.push(JSON.stringify(t.facts))),t.narrative!==void 0&&(n.push("narrative = ?"),o.push(t.narrative)),t.concepts!==void 0&&(n.push("concepts = ?"),o.push(JSON.stringify(t.concepts))),t.files_read!==void 0&&(n.push("files_read = ?"),o.push(JSON.stringify(t.files_read))),t.files_modified!==void 0&&(n.push("files_modified = ?"),o.push(JSON.stringify(t.files_modified))),t.prompt_number!==void 0&&(n.push("prompt_number = ?"),o.push(t.prompt_number)),t.discovery_tokens!==void 0&&(n.push("discovery_tokens = ?"),o.push(t.discovery_tokens)),t.title!==void 0||t.narrative!==void 0){let c=t.title!==void 0?t.title:s.title??null,d=t.narrative!==void 0?t.narrative:s.narrative??null;n.push("content_hash = ?"),o.push(N(s.memory_session_id,c,d))}return n.length===0?!1:(this.db.prepare(`
      UPDATE observations
      SET ${n.join(", ")}
      WHERE id = ?
    `).run(...o,e).changes??0)>0}deleteObservation(e){return(this.db.prepare(`
      DELETE FROM observations
      WHERE id = ?
    `).run(e).changes??0)>0}getObservationsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o,type:i,concepts:a,files:c}=t,d=s==="date_asc"?"ASC":"DESC",l=n?`LIMIT ${n}`:"",p=e.map(()=>"?").join(","),f=[...e],T=[];if(o&&(T.push("project = ?"),f.push(o)),i)if(Array.isArray(i)){let E=i.map(()=>"?").join(",");T.push(`type IN (${E})`),f.push(...i)}else T.push("type = ?"),f.push(i);if(a){let E=Array.isArray(a)?a:[a],_=E.map(()=>"EXISTS (SELECT 1 FROM json_each(concepts) WHERE value = ?)");f.push(...E),T.push(`(${_.join(" OR ")})`)}if(c){let E=Array.isArray(c)?c:[c],_=E.map(()=>"(EXISTS (SELECT 1 FROM json_each(files_read) WHERE value LIKE ?) OR EXISTS (SELECT 1 FROM json_each(files_modified) WHERE value LIKE ?))");E.forEach(g=>{f.push(`%${g}%`,`%${g}%`)}),T.push(`(${_.join(" OR ")})`)}let b=T.length>0?`WHERE id IN (${p}) AND ${T.join(" AND ")}`:`WHERE id IN (${p})`;return this.db.prepare(`
      SELECT *
      FROM observations
      ${b}
      ORDER BY created_at_epoch ${d}
      ${l}
    `).all(...f)}getSummaryForSession(e){return this.db.prepare(`
      SELECT
        request, investigated, learned, completed, next_steps,
        files_read, files_edited, notes, prompt_number, created_at,
        created_at_epoch
      FROM session_summaries
      WHERE memory_session_id = ?
      ORDER BY created_at_epoch DESC
      LIMIT 1
    `).get(e)||null}getStoredSessionSummaryById(e){return this.db.prepare(`
      SELECT *
      FROM session_summaries
      WHERE id = ?
    `).get(e)||null}updateSessionSummary(e,t){let s=[],n=[],o=(c,d)=>{s.push(`${c} = ?`),n.push(d)};return t.project!==void 0&&o("project",t.project),t.request!==void 0&&o("request",t.request),t.investigated!==void 0&&o("investigated",t.investigated),t.learned!==void 0&&o("learned",t.learned),t.completed!==void 0&&o("completed",t.completed),t.next_steps!==void 0&&o("next_steps",t.next_steps),t.files_read!==void 0&&o("files_read",t.files_read),t.files_edited!==void 0&&o("files_edited",t.files_edited),t.notes!==void 0&&o("notes",t.notes),t.prompt_number!==void 0&&o("prompt_number",t.prompt_number),t.discovery_tokens!==void 0&&o("discovery_tokens",t.discovery_tokens),s.length===0?!1:(this.db.prepare(`
      UPDATE session_summaries
      SET ${s.join(", ")}
      WHERE id = ?
    `).run(...n,e).changes??0)>0}deleteSessionSummary(e){return(this.db.prepare(`
      DELETE FROM session_summaries
      WHERE id = ?
    `).run(e).changes??0)>0}getFilesForSession(e){let s=this.db.prepare(`
      SELECT files_read, files_modified
      FROM observations
      WHERE memory_session_id = ?
    `).all(e),n=new Set,o=new Set;for(let i of s){if(i.files_read){let a=JSON.parse(i.files_read);Array.isArray(a)&&a.forEach(c=>n.add(c))}if(i.files_modified){let a=JSON.parse(i.files_modified);Array.isArray(a)&&a.forEach(c=>o.add(c))}}return{filesRead:Array.from(n),filesModified:Array.from(o)}}getSessionById(e){return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project, user_prompt, custom_title
      FROM sdk_sessions
      WHERE id = ?
      LIMIT 1
    `).get(e)||null}getSdkSessionsBySessionIds(e){if(e.length===0)return[];let t=e.map(()=>"?").join(",");return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project, user_prompt, custom_title,
             started_at, started_at_epoch, completed_at, completed_at_epoch, status
      FROM sdk_sessions
      WHERE memory_session_id IN (${t})
      ORDER BY started_at_epoch DESC
    `).all(...e)}getPromptNumberFromUserPrompts(e){return this.db.prepare(`
      SELECT COUNT(*) as count FROM user_prompts WHERE content_session_id = ?
    `).get(e).count}createSDKSession(e,t,s,n){let o=new Date,i=o.getTime(),a=this.db.prepare(`
      SELECT id FROM sdk_sessions WHERE content_session_id = ?
    `).get(e);return a?(t&&this.db.prepare(`
          UPDATE sdk_sessions SET project = ?
          WHERE content_session_id = ? AND (project IS NULL OR project = '')
        `).run(t,e),n&&this.db.prepare(`
          UPDATE sdk_sessions SET custom_title = ?
          WHERE content_session_id = ? AND custom_title IS NULL
        `).run(n,e),a.id):(this.db.prepare(`
      INSERT INTO sdk_sessions
      (content_session_id, memory_session_id, project, user_prompt, custom_title, started_at, started_at_epoch, status)
      VALUES (?, NULL, ?, ?, ?, ?, ?, 'active')
    `).run(e,t,s,n||null,o.toISOString(),i),this.db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(e).id)}saveUserPrompt(e,t,s){let n=new Date,o=n.getTime();return this.db.prepare(`
      INSERT INTO user_prompts
      (content_session_id, prompt_number, prompt_text, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?)
    `).run(e,t,s,n.toISOString(),o).lastInsertRowid}updateUserPrompt(e,t){let s=[],n=[];return t.prompt_number!==void 0&&(s.push("prompt_number = ?"),n.push(t.prompt_number)),t.prompt_text!==void 0&&(s.push("prompt_text = ?"),n.push(t.prompt_text)),s.length===0?!1:(this.db.prepare(`
      UPDATE user_prompts
      SET ${s.join(", ")}
      WHERE id = ?
    `).run(...n,e).changes??0)>0}deleteUserPrompt(e){return(this.db.prepare(`
      DELETE FROM user_prompts
      WHERE id = ?
    `).run(e).changes??0)>0}getUserPrompt(e,t){return this.db.prepare(`
      SELECT prompt_text
      FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
      LIMIT 1
    `).get(e,t)?.prompt_text??null}storeObservation(e,t,s,n,o=0,i){let a=i??Date.now(),c=new Date(a).toISOString(),d=N(e,s.title,s.narrative),l=B(this.db,d,a);if(l)return{id:l.id,createdAtEpoch:l.created_at_epoch};let f=this.db.prepare(`
      INSERT INTO observations
      (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
       files_read, files_modified, prompt_number, discovery_tokens, content_hash, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,t,s.type,s.title,s.subtitle,JSON.stringify(s.facts),s.narrative,JSON.stringify(s.concepts),JSON.stringify(s.files_read),JSON.stringify(s.files_modified),n||null,o,d,c,a);return{id:Number(f.lastInsertRowid),createdAtEpoch:a}}storeSummary(e,t,s,n,o=0,i){let a=i??Date.now(),c=new Date(a).toISOString(),l=this.db.prepare(`
      INSERT INTO session_summaries
      (memory_session_id, project, request, investigated, learned, completed,
       next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,t,s.request,s.investigated,s.learned,s.completed,s.next_steps,s.notes,n||null,o,c,a);return{id:Number(l.lastInsertRowid),createdAtEpoch:a}}storeObservations(e,t,s,n,o,i=0,a){let c=a??Date.now(),d=new Date(c).toISOString();return this.db.transaction(()=>{let p=[],f=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, content_hash, created_at, created_at_epoch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);for(let b of s){let S=N(e,b.title,b.narrative),E=B(this.db,S,c);if(E){p.push(E.id);continue}let _=f.run(e,t,b.type,b.title,b.subtitle,JSON.stringify(b.facts),b.narrative,JSON.stringify(b.concepts),JSON.stringify(b.files_read),JSON.stringify(b.files_modified),o||null,i,S,d,c);p.push(Number(_.lastInsertRowid))}let T=null;if(n){let S=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,t,n.request,n.investigated,n.learned,n.completed,n.next_steps,n.notes,o||null,i,d,c);T=Number(S.lastInsertRowid)}return{observationIds:p,summaryId:T,createdAtEpoch:c}})()}storeObservationsAndMarkComplete(e,t,s,n,o,i,a,c=0,d){let l=d??Date.now(),p=new Date(l).toISOString();return this.db.transaction(()=>{let T=[],b=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, content_hash, created_at, created_at_epoch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);for(let _ of s){let g=N(e,_.title,_.narrative),y=B(this.db,g,l);if(y){T.push(y.id);continue}let ie=b.run(e,t,_.type,_.title,_.subtitle,JSON.stringify(_.facts),_.narrative,JSON.stringify(_.concepts),JSON.stringify(_.files_read),JSON.stringify(_.files_modified),a||null,c,g,p,l);T.push(Number(ie.lastInsertRowid))}let S;if(n){let g=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,t,n.request,n.investigated,n.learned,n.completed,n.next_steps,n.notes,a||null,c,p,l);S=Number(g.lastInsertRowid)}return this.db.prepare(`
        UPDATE pending_messages
        SET
          status = 'processed',
          completed_at_epoch = ?,
          tool_input = NULL,
          tool_response = NULL
        WHERE id = ? AND status = 'processing'
      `).run(l,o),{observationIds:T,summaryId:S,createdAtEpoch:l}})()}getSessionSummariesByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="date_asc"?"ASC":"DESC",a=n?`LIMIT ${n}`:"",c=e.map(()=>"?").join(","),d=[...e],l=o?`WHERE id IN (${c}) AND project = ?`:`WHERE id IN (${c})`;return o&&d.push(o),this.db.prepare(`
      SELECT * FROM session_summaries
      ${l}
      ORDER BY created_at_epoch ${i}
      ${a}
    `).all(...d)}getUserPromptsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="date_asc"?"ASC":"DESC",a=n?`LIMIT ${n}`:"",c=e.map(()=>"?").join(","),d=[...e],l=o?"AND s.project = ?":"";return o&&d.push(o),this.db.prepare(`
      SELECT
        up.*,
        s.project,
        s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.id IN (${c}) ${l}
      ORDER BY up.created_at_epoch ${i}
      ${a}
    `).all(...d)}getTimelineAroundTimestamp(e,t=10,s=10,n){return this.getTimelineAroundObservation(null,e,t,s,n)}getTimelineAroundObservation(e,t,s=10,n=10,o){let i=o?"AND project = ?":"",a=o?[o]:[],c,d;if(e!==null){let E=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id <= ? ${i}
        ORDER BY id DESC
        LIMIT ?
      `,_=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id >= ? ${i}
        ORDER BY id ASC
        LIMIT ?
      `;try{let g=this.db.prepare(E).all(e,...a,s+1),y=this.db.prepare(_).all(e,...a,n+1);if(g.length===0&&y.length===0)return{observations:[],sessions:[],prompts:[]};c=g.length>0?g[g.length-1].created_at_epoch:t,d=y.length>0?y[y.length-1].created_at_epoch:t}catch(g){return u.error("DB","Error getting boundary observations",void 0,{error:g,project:o}),{observations:[],sessions:[],prompts:[]}}}else{let E=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch <= ? ${i}
        ORDER BY created_at_epoch DESC
        LIMIT ?
      `,_=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch >= ? ${i}
        ORDER BY created_at_epoch ASC
        LIMIT ?
      `;try{let g=this.db.prepare(E).all(t,...a,s),y=this.db.prepare(_).all(t,...a,n+1);if(g.length===0&&y.length===0)return{observations:[],sessions:[],prompts:[]};c=g.length>0?g[g.length-1].created_at_epoch:t,d=y.length>0?y[y.length-1].created_at_epoch:t}catch(g){return u.error("DB","Error getting boundary timestamps",void 0,{error:g,project:o}),{observations:[],sessions:[],prompts:[]}}}let l=`
      SELECT *
      FROM observations
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,p=`
      SELECT *
      FROM session_summaries
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,f=`
      SELECT up.*, s.project, s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.created_at_epoch >= ? AND up.created_at_epoch <= ? ${i.replace("project","s.project")}
      ORDER BY up.created_at_epoch ASC
    `,T=this.db.prepare(l).all(c,d,...a),b=this.db.prepare(p).all(c,d,...a),S=this.db.prepare(f).all(c,d,...a);return{observations:T,sessions:b.map(E=>({id:E.id,memory_session_id:E.memory_session_id,project:E.project,request:E.request,completed:E.completed,next_steps:E.next_steps,created_at:E.created_at,created_at_epoch:E.created_at_epoch})),prompts:S.map(E=>({id:E.id,content_session_id:E.content_session_id,prompt_number:E.prompt_number,prompt_text:E.prompt_text,project:E.project,created_at:E.created_at,created_at_epoch:E.created_at_epoch}))}}getPromptById(e){return this.db.prepare(`
      SELECT
        p.id,
        p.content_session_id,
        p.prompt_number,
        p.prompt_text,
        s.project,
        p.created_at,
        p.created_at_epoch
      FROM user_prompts p
      LEFT JOIN sdk_sessions s ON p.content_session_id = s.content_session_id
      WHERE p.id = ?
      LIMIT 1
    `).get(e)||null}getPromptsByIds(e){if(e.length===0)return[];let t=e.map(()=>"?").join(",");return this.db.prepare(`
      SELECT
        p.id,
        p.content_session_id,
        p.prompt_number,
        p.prompt_text,
        s.project,
        p.created_at,
        p.created_at_epoch
      FROM user_prompts p
      LEFT JOIN sdk_sessions s ON p.content_session_id = s.content_session_id
      WHERE p.id IN (${t})
      ORDER BY p.created_at_epoch DESC
    `).all(...e)}getSessionSummaryById(e){return this.db.prepare(`
      SELECT
        id,
        memory_session_id,
        content_session_id,
        project,
        user_prompt,
        request_summary,
        learned_summary,
        status,
        created_at,
        created_at_epoch
      FROM sdk_sessions
      WHERE id = ?
      LIMIT 1
    `).get(e)||null}getOrCreateManualSession(e){let t=`manual-${e}`,s=`manual-content-${e}`;if(this.db.prepare("SELECT memory_session_id FROM sdk_sessions WHERE memory_session_id = ?").get(t))return t;let o=new Date;return this.db.prepare(`
      INSERT INTO sdk_sessions (memory_session_id, content_session_id, project, started_at, started_at_epoch, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(t,s,e,o.toISOString(),o.getTime()),u.info("SESSION","Created manual session",{memorySessionId:t,project:e}),t}close(){this.db.close()}importSdkSession(e){let t=this.db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(e.content_session_id);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO sdk_sessions (
        content_session_id, memory_session_id, project, user_prompt,
        started_at, started_at_epoch, completed_at, completed_at_epoch, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.content_session_id,e.memory_session_id,e.project,e.user_prompt,e.started_at,e.started_at_epoch,e.completed_at,e.completed_at_epoch,e.status).lastInsertRowid}}importSessionSummary(e){let t=this.db.prepare("SELECT id FROM session_summaries WHERE memory_session_id = ?").get(e.memory_session_id);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO session_summaries (
        memory_session_id, project, request, investigated, learned,
        completed, next_steps, files_read, files_edited, notes,
        prompt_number, discovery_tokens, created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.memory_session_id,e.project,e.request,e.investigated,e.learned,e.completed,e.next_steps,e.files_read,e.files_edited,e.notes,e.prompt_number,e.discovery_tokens||0,e.created_at,e.created_at_epoch).lastInsertRowid}}importObservation(e){let t=this.db.prepare(`
      SELECT id FROM observations
      WHERE memory_session_id = ? AND title = ? AND created_at_epoch = ?
    `).get(e.memory_session_id,e.title,e.created_at_epoch);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO observations (
        memory_session_id, project, text, type, title, subtitle,
        facts, narrative, concepts, files_read, files_modified,
        prompt_number, discovery_tokens, created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.memory_session_id,e.project,e.text,e.type,e.title,e.subtitle,e.facts,e.narrative,e.concepts,e.files_read,e.files_modified,e.prompt_number,e.discovery_tokens||0,e.created_at,e.created_at_epoch).lastInsertRowid}}importUserPrompt(e){let t=this.db.prepare(`
      SELECT id FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
    `).get(e.content_session_id,e.prompt_number);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO user_prompts (
        content_session_id, prompt_number, prompt_text,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?)
    `).run(e.content_session_id,e.prompt_number,e.prompt_text,e.created_at,e.created_at_epoch).lastInsertRowid}}};var pe=C(require("path"),1);function G(r,e,t=.5){if(r<1)return 0;let s=Date.now(),n=Math.max(s-e,1e3)/1e3,o=r*Math.pow(n,-t);return Math.log(o)}function W(r){let{baseActivation:e,importance:t,accessCount:s}=r,n=Math.log(Math.max(s,1))/Math.LN2;return e*t*n}var L=class{nodes=new Map;edges=new Map;addNode(e){this.nodes.set(e.id,{id:e.id,cmu:e,activation:e.metadata.baseActivation})}addAssociation(e,t,s){let n=this.edges.get(e)||[];n.push({targetId:t,strength:s}),this.edges.set(e,n);let o=this.edges.get(t)||[];o.push({targetId:e,strength:s*.5}),this.edges.set(t,o)}getNode(e){return this.nodes.get(e)}getAssociations(e){return this.edges.get(e)||[]}retrieveContext(e,t=3){let s=new Map;for(let o of e)this.nodes.get(o)&&s.set(o,1);for(let o=0;o<t;o++){let i=new Map;for(let[a,c]of s){let d=this.edges.get(a)||[],l=d.length;if(l!==0)for(let p of d){let f=c*p.strength/Math.sqrt(l),T=i.get(p.targetId)||0;i.set(p.targetId,T+f)}}for(let[a,c]of i){let d=s.get(a)||0;s.set(a,d+c)}}let n=[];for(let[o,i]of s){let a=this.nodes.get(o);a&&n.push({id:o,score:i+a.activation})}return n.sort((o,i)=>i.score-o.score),n.map(o=>o.id)}getAllNodes(){return Array.from(this.nodes.values())}size(){return this.nodes.size}};function ls(r,e){if(r.length!==e.length||r.length===0)return 0;let t=0,s=0,n=0;for(let o=0;o<r.length;o++)t+=r[o]*e[o],s+=r[o]*r[o],n+=e[o]*e[o];return s===0||n===0?0:t/(Math.sqrt(s)*Math.sqrt(n))}function Pe(r,e){let t=r.toLowerCase().split(/\s+/).filter(Boolean),s=new Map;for(let n of t)s.set(n,(s.get(n)||0)+1);return e.map(n=>s.get(n)||0)}function ms(r,e){let t=[r.content.title,r.content.narrative,...r.content.facts,...r.content.concepts].join(" "),s=[e.content.title,e.content.narrative,...e.content.facts,...e.content.concepts].join(" "),n=Array.from(new Set([...t.toLowerCase().split(/\s+/),...s.toLowerCase().split(/\s+/)].filter(Boolean))),o=Pe(t,n),i=Pe(s,n);return ls(o,i)}function je(r,e=.95){let t=[],s=new Set;for(let n=0;n<r.length;n++)for(let o=n+1;o<r.length;o++){let i=r[n].id,a=r[o].id;if(s.has(i)||s.has(a))continue;let c=ms(r[n],r[o]);if(c>=e){let d=r[n].metadata.accessCount>r[o].metadata.accessCount?r[n]:r[o],l=r[n].metadata.accessCount>r[o].metadata.accessCount?r[o]:r[n];t.push({keep:d,remove:l,similarity:c}),s.add(l.id)}}return t}function us(r,e,t=.5){let s=[];for(let n of r){let o=W(n.metadata);o<e&&s.push({cmu:n,retentionScore:o})}return s.sort((n,o)=>n.retentionScore-o.retentionScore)}function Fe(r,e,t,s=.5){if(r.length<=e)return r;let n=us(r,t,s),o=new Set(n.map(i=>i.cmu.id));return r.filter(i=>!o.has(i.id)).slice(0,e)}function Be(r,e){let t=e*24*60*60*1e3,s=Date.now();return r.filter(n=>{let o=s-n.metadata.createdAt;return n.metadata.importance>=.7?!0:o<t})}var me=class extends Error{constructor(t,s){super(t);this.cause=s;this.name="MemoryError"}};var H=class extends me{constructor(e,t){super(`Pruning failed: ${e}`,t),this.name="PruningError"}};async function Xe(r,e={}){let{dedupeThreshold:t=.95,importanceThreshold:s=.1,maxAgeDays:n=30,maxPerTier:o={}}=e,i=new L;for(let l of r)i.addNode(l);let a=0,c=0,d=0;try{let l=je(r,t),p=new Set,f=Object.fromEntries(r.map(_=>[_.id,new Set(_.associations)]));for(let _ of l){p.add(_.remove.id),f[_.keep.id]?.add(_.remove.id);for(let g of _.remove.associations)f[_.keep.id]?.add(g);a++}d=ps(r,i,f);let T=r.filter(_=>!p.has(_.id)),b=_s(T,f),S=new Map;for(let _ of T){let g=S.get(_.tier)||0;S.set(_.tier,g+1)}for(let[_,g]of Object.entries(o)){let y=S.get(_)||0;if(y>g){let ie=T.filter(ae=>ae.tier===_),Yt=y-g,Vt=Fe(ie,g,s).slice(-Yt);for(let ae of Vt)p.add(ae.id),c++}}let E=Be(T,n);for(let _ of T)E.find(g=>g.id===_.id)||p.add(_.id);return c=p.size-a,{merged:a,pruned:c,linked:d,removedIds:Array.from(p),associationsById:Object.fromEntries(Object.entries(f).filter(([_])=>!p.has(_)).map(([_,g])=>[_,Array.from(g).filter(y=>y!==_&&!p.has(y))])),synthesized:b}}catch(l){throw new H(`Consolidation failed: ${l instanceof Error?l.message:"Unknown error"}`,l)}}function ps(r,e,t){let s=0;for(let n=0;n<r.length;n++)for(let o of r[n].content.concepts){for(let i=n+1;i<r.length;i++)r[i].content.concepts.includes(o)&&(r[n].associations.includes(r[i].id)||(e.addAssociation(r[n].id,r[i].id,.5),t[r[n].id]?.add(r[i].id),t[r[i].id]?.add(r[n].id),s++));for(let i of r[n].content.filesRead)for(let a=0;a<r.length;a++)n!==a&&(r[a].content.filesRead.includes(i)||r[a].content.filesModified.includes(i))&&(r[n].associations.includes(r[a].id)||(e.addAssociation(r[n].id,r[a].id,.7),t[r[n].id]?.add(r[a].id),t[r[a].id]?.add(r[n].id),s++))}return s}function _s(r,e){let t=[],s=new Set(r.map(n=>`${n.tier}:${n.content.title.trim().toLowerCase()}:${n.project}`));for(let n of gs(r)){let o=hs(n),i=`${o.tier}:${o.content.title.trim().toLowerCase()}:${o.project}`;s.has(i)||(s.add(i),t.push(o))}for(let n of Es(r)){let o=bs(n),i=`${o.tier}:${o.content.title.trim().toLowerCase()}:${o.project}`;s.has(i)||(s.add(i),t.push(o))}for(let n of fs(r)){let o=Ss(n),i=`${o.tier}:${o.content.title.trim().toLowerCase()}:${o.project}`;s.has(i)||(s.add(i),t.push(o))}for(let n of Ts(r)){let o=ys(n),i=`${o.tier}:${o.content.title.trim().toLowerCase()}:${o.project}`;s.has(i)||(s.add(i),t.push(o))}return t}function gs(r){let e=new Map,t=new Map;for(let s of r)if(s.tier!=="procedural"&&!(s.content.title.startsWith("Knowledge:")||s.content.title.startsWith("Workflow:"))){for(let n of new Set([...s.content.filesRead,...s.content.filesModified])){let o=`${s.project}:file:${n}`;e.set(o,[...e.get(o)??[],s])}for(let n of s.content.concepts){if(n.startsWith("source:")||n.length<4)continue;let o=`${s.project}:concept:${n}`;t.set(o,[...t.get(o)??[],s])}}return[...e.values(),...t.values()].map(Ge).filter(s=>s.length>=2)}function Es(r){let e=new Map;for(let t of r){if(t.tier!=="procedural")continue;let s=ue(t.content.title);if(!s)continue;let n=`${t.project}:${s}`;e.set(n,[...e.get(n)??[],t])}return Array.from(e.values()).filter(t=>t.length>=2)}function fs(r){let e=new Map;for(let t of r){if(t.tier==="sensory"||t.content.title.startsWith("Knowledge:")||t.content.title.startsWith("Workflow:"))continue;let s=`${t.project}:${t.sessionId}`;e.set(s,[...e.get(s)??[],t])}return Array.from(e.values()).map(t=>[...t].sort((s,n)=>s.metadata.createdAt-n.metadata.createdAt)).filter(t=>t.filter(n=>n.tier==="procedural"||n.memoryType==="change"||n.content.filesModified.length>0).length>=3)}function Ts(r){let e=new Map;for(let t of r){if(t.content.title.startsWith("Knowledge:")||t.content.title.startsWith("Workflow:"))continue;let s=[t.content.title,t.content.narrative,...t.content.facts];for(let n of s){let o=We(n);if(!o)continue;let i=`${t.project}:${o}`;e.set(i,[...e.get(i)??[],t])}}return Array.from(e.values()).map(Ge).filter(t=>t.length>=2)}function hs(r){let e=[...r].sort((d,l)=>l.metadata.importance-d.metadata.importance),t=e[0],s=Rs(e),n=vs(e),o=s??n??t.content.title,i=Array.from(new Set(e.flatMap(d=>d.content.facts).filter(Boolean))).slice(0,6),a=Array.from(new Set(e.flatMap(d=>[...d.content.filesRead,...d.content.filesModified]))).slice(0,8),c=Array.from(new Set(["distilled","reflection",...n?[n]:[],...e.flatMap(d=>d.content.concepts.filter(l=>!l.startsWith("source:")))])).slice(0,12);return{sessionId:t.sessionId,project:t.project,tier:"semantic",memoryType:"decision",importance:Math.min(.95,Y(r.map(d=>d.metadata.importance))+.15),associations:e.map(d=>d.id),content:{title:`Knowledge: ${String(o).slice(0,80)}`,narrative:`Distilled from ${e.length} related memories about ${o}. ${Is(e)}`,facts:i,concepts:c,filesRead:a,filesModified:[]}}}function bs(r){let e=[...r].sort((a,c)=>c.metadata.accessCount-a.metadata.accessCount),t=e[0],s=ue(t.content.title)??t.content.title,n=Array.from(new Set(e.flatMap(a=>a.content.filesModified))).slice(0,8),o=Array.from(new Set(e.flatMap(a=>a.content.filesRead))).slice(0,8),i=Array.from(new Set(["workflow","distilled",...e.flatMap(a=>a.content.concepts.filter(c=>!c.startsWith("source:")))])).slice(0,12);return{sessionId:t.sessionId,project:t.project,tier:"procedural",memoryType:"change",importance:Math.min(.98,Y(r.map(a=>a.metadata.importance))+.12),associations:e.map(a=>a.id),content:{title:`Workflow: ${s.slice(0,80)}`,narrative:`Distilled from ${e.length} successful procedural memories for ${s}. Reuse this workflow before reconstructing it from scratch.`,facts:Array.from(new Set(e.flatMap(a=>a.content.facts).filter(Boolean))).slice(0,5),concepts:i,filesRead:o,filesModified:n}}}function Ss(r){let e=r[0],t=r.filter(a=>a.tier==="procedural"||a.memoryType==="change"||a.content.filesModified.length>0).slice(0,5),s=t.map(a=>ue(a.content.title)??a.content.title),n=Array.from(new Set(t.flatMap(a=>a.content.filesModified))).slice(0,8),o=Array.from(new Set(r.flatMap(a=>a.content.filesRead))).slice(0,8),i=Array.from(new Set(["workflow","trajectory","distilled",...r.flatMap(a=>a.content.concepts.filter(c=>!c.startsWith("source:")))])).slice(0,12);return{sessionId:e.sessionId,project:e.project,tier:"procedural",memoryType:"change",importance:Math.min(.99,Y(r.map(a=>a.metadata.importance))+.18),associations:r.map(a=>a.id),content:{title:`Workflow: ${s[0]??"session trajectory"}`,narrative:`Successful trajectory distilled from session ${e.sessionId}. Typical sequence: ${s.join(" -> ")}.`,facts:s.slice(0,5),concepts:i,filesRead:o,filesModified:n}}}function ys(r){let e=r[0],t=We([e.content.title,e.content.narrative,...e.content.facts].join(" "))??e.content.title,s=Array.from(new Set(r.flatMap(o=>o.content.facts).filter(Boolean))).slice(0,6),n=Array.from(new Set(["invariant","preference","constraint",...r.flatMap(o=>o.content.concepts.filter(i=>!i.startsWith("source:")))])).slice(0,12);return{sessionId:e.sessionId,project:e.project,tier:"semantic",memoryType:"decision",importance:Math.min(.99,Y(r.map(o=>o.metadata.importance))+.2),associations:r.map(o=>o.id),content:{title:`Knowledge: ${t.slice(0,80)}`,narrative:`Stable invariant distilled from ${r.length} related memories. ${r.map(o=>o.content.narrative).filter(Boolean)[0]?.slice(0,180)??""}`.trim(),facts:s,concepts:n,filesRead:Array.from(new Set(r.flatMap(o=>o.content.filesRead))).slice(0,8),filesModified:Array.from(new Set(r.flatMap(o=>o.content.filesModified))).slice(0,8)}}}function Ge(r){let e=new Set;return r.filter(t=>e.has(t.id)?!1:(e.add(t.id),!0))}function Y(r){return r.reduce((e,t)=>e+t,0)/Math.max(r.length,1)}function Rs(r){let e=new Map;for(let t of r)for(let s of new Set([...t.content.filesRead,...t.content.filesModified]))e.set(s,(e.get(s)??0)+1);return Array.from(e.entries()).sort((t,s)=>s[1]-t[1]).find(([,t])=>t>=2)?.[0]}function vs(r){let e=new Map;for(let t of r)for(let s of t.content.concepts.filter(n=>!n.startsWith("source:")))e.set(s,(e.get(s)??0)+1);return Array.from(e.entries()).sort((t,s)=>s[1]-t[1]).find(([,t])=>t>=2)?.[0]}function Is(r){return r.map(e=>e.content.narrative.trim()).filter(Boolean).slice(0,2).map(e=>e.slice(0,140)).join(" ")}function ue(r){if(r.startsWith("Procedure: /"))return r.replace("Procedure: /","/");if(r.startsWith("Tool: "))return r.replace("Tool: ","")}function We(r){let e=r.trim().replace(/\s+/g," ");if(!e)return;let t=e.toLowerCase();if(["do not ","don't ","must ","should ","always ","never ","prefer ","required ","constraint"].some(n=>t.includes(n)))return e}var V=class{constructor(e){this.db=e}async getSyncToken(){let e=this.db.query(`
      SELECT
        COUNT(*) AS total,
        COALESCE(MAX(id), 0) AS max_id,
        COALESCE(MAX(created_at_epoch), 0) AS max_created_at,
        COALESCE(MAX(last_accessed), 0) AS max_last_accessed
      FROM observations
      WHERE tier IS NOT NULL
    `).get();return[e.total,e.max_id,e.max_created_at,e.max_last_accessed].join(":")}ensureSession(e,t,s){let n=new Date(s).toISOString();this.db.query(`
      INSERT OR IGNORE INTO sdk_sessions (
        content_session_id,
        memory_session_id,
        project,
        started_at,
        started_at_epoch,
        status
      ) VALUES (?, ?, ?, ?, ?, 'active')
    `).run(e,e,t,n,s)}async getAllMemories(){return this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE tier IS NOT NULL
    `).all().map(this.rowToCMU)}async getMemoryById(e){let t=this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE id = ?
    `).get(e);return t?this.rowToCMU(t):null}async getMemoriesByProject(e){return this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE project = ? AND tier IS NOT NULL
      ORDER BY base_activation DESC
    `).all(e).map(this.rowToCMU)}async getMemoriesByTier(e){return this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE tier = ?
      ORDER BY base_activation DESC
    `).all(e).map(this.rowToCMU)}async updateActivation(e,t){this.db.query(`
      UPDATE observations SET base_activation = ? WHERE id = ?
    `).run(t,e)}async updateAssociations(e,t){this.db.query(`
      UPDATE observations SET associations = ? WHERE id = ?
    `).run(JSON.stringify(t),e)}async updateQuality(e,t,s,n){this.db.query(`
      UPDATE observations
      SET tier = ?, importance = ?, decay_rate = ?
      WHERE id = ?
    `).run(t,s,n,e)}async updateLastAccessed(e,t){this.db.query(`
      UPDATE observations SET last_accessed = ? WHERE id = ?
    `).run(t,e)}async incrementAccessCount(e){this.db.query(`
      UPDATE observations SET access_count = access_count + 1 WHERE id = ?
    `).run(e)}async deleteMemory(e){this.db.query("DELETE FROM observations WHERE id = ?").run(e)}async storeMemory(e){let t=new Date(e.metadata.createdAt).toISOString(),s=N(e.sessionId,e.content.title,e.content.narrative);this.ensureSession(e.sessionId,e.project,e.metadata.createdAt);let n=this.db.query(`
      INSERT INTO observations (
        memory_session_id, project, text, type, title, facts, narrative, concepts,
        files_read, files_modified, created_at, created_at_epoch, tier,
        importance, base_activation, decay_rate, tags, associations,
        last_accessed, access_count, content_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.sessionId,e.project,e.content.narrative,e.memoryType,e.content.title,JSON.stringify(e.content.facts),e.content.narrative,JSON.stringify(e.content.concepts),JSON.stringify(e.content.filesRead),JSON.stringify(e.content.filesModified),t,e.metadata.createdAt,e.tier,e.metadata.importance,e.metadata.baseActivation,e.metadata.decayRate,JSON.stringify(e.tags),JSON.stringify(e.associations),e.metadata.lastAccessed,e.metadata.accessCount,s);return String(n.lastInsertRowid)}async searchByKeywords(e,t=50){let s;if(e.length===0)return s=this.db.query(`
        SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
               facts, files_read, files_modified,
               importance, base_activation, decay_rate, tags, associations,
               last_accessed, access_count, created_at_epoch
        FROM observations
        WHERE tier IS NOT NULL
        ORDER BY base_activation DESC
        LIMIT ?
      `).all(t),s.map(this.rowToCMU);let n=e.map(()=>"(COALESCE(text, '') LIKE ? OR COALESCE(title, '') LIKE ? OR COALESCE(narrative, '') LIKE ? OR COALESCE(concepts, '') LIKE ?)").join(" OR "),o=e.flatMap(i=>{let a=`%${i}%`;return[a,a,a,a]});return s=this.db.query(`
      SELECT id, memory_session_id, project, tier, type, text, title, narrative, concepts,
             facts, files_read, files_modified,
             importance, base_activation, decay_rate, tags, associations,
             last_accessed, access_count, created_at_epoch
      FROM observations
      WHERE tier IS NOT NULL AND (${n})
      ORDER BY base_activation DESC
      LIMIT ?
    `).all(...o,t),s.map(this.rowToCMU)}rowToCMU(e){let t=JSON.parse(e.tags||"[]"),s=JSON.parse(e.associations||"[]"),n=JSON.parse(e.facts||"[]"),o=JSON.parse(e.concepts||"[]"),i=JSON.parse(e.files_read||"[]"),a=JSON.parse(e.files_modified||"[]");return{id:String(e.id),sessionId:e.memory_session_id,project:e.project,tier:e.tier||"episodic",memoryType:e.type,content:{title:e.title||"",narrative:e.narrative||e.text||"",facts:n,concepts:o,filesRead:i,filesModified:a},metadata:{createdAt:e.created_at_epoch,lastAccessed:e.last_accessed||e.created_at_epoch,accessCount:e.access_count||0,importance:e.importance||.5,baseActivation:e.base_activation||0,decayRate:e.decay_rate||.5},tags:t,associations:s}}};var He={enabled:!0,observations:50,sessions:10,tiers:{sensory:{decay:.9,maxCount:100},working:{decay:.5,maxCount:50},episodic:{decay:.3,maxCount:1e3},semantic:{decay:.1,maxCount:1e4},procedural:{decay:.2,maxCount:500}},actr:{decayParameter:.5,activationThreshold:.1},pruning:{dedupeSimilarity:.95,importanceThreshold:.2,consolidateOnIdleMinutes:15,maxAgeDays:30},vectorDb:{provider:"none",collectionName:"ai-mem"}};var Os={sensory:.35,working:.85,episodic:1.2,semantic:2.3,procedural:2},qe=/^tool:\s+(read|glob|grep|search|find|ls|list|view)\b/i;function Ms(r,e){if(e.includes(r))return!0;let t=r.replace(/\\/g,"/"),s=pe.default.posix.basename(t);return e.some(n=>{let o=n.replace(/\\/g,"/");return o===t||pe.default.posix.basename(o)===s})}var _e=class{storage;settings;graph=null;lastSyncToken=null;constructor(e,t){this.storage=new V(e),this.settings={...He,...t}}async initialize(){await this.refreshGraph()}async refreshGraph(){this.graph=new L;let e=await this.storage.getAllMemories();for(let t of e)this.graph.addNode(t);this.lastSyncToken=await this.storage.getSyncToken()}async ensureFreshGraph(){let e=await this.storage.getSyncToken();(!this.graph||this.lastSyncToken!==e)&&await this.refreshGraph()}async captureMemory(e,t,s,n,o=.5){let i=Date.now(),a=this.determineTier(s),c=this.normalizeImportance(s,a,n,o),d={id:"",sessionId:e,project:t,tier:a,memoryType:n,content:s,metadata:{createdAt:i,lastAccessed:i,accessCount:1,importance:c,baseActivation:G(1,i,this.settings.actr.decayParameter),decayRate:this.settings.tiers[a]?.decay??.5},tags:[],associations:[]},l=await this.storage.storeMemory(d),p={...d,id:l};return this.graph&&this.graph.addNode(p),this.lastSyncToken=null,p}async retrieveMemories(e,t,s=50){await this.ensureFreshGraph();let n=e.toLowerCase().split(/\s+/).filter(Boolean),i=await this.storage.searchByKeywords(n,s*2);if(t?.tiers?.length){let c=t.tiers;i=i.filter(d=>c.includes(d.tier))}if(t?.projects?.length){let c=t.projects;i=i.filter(d=>Ms(d.project,c))}if(t?.minImportance!==void 0){let c=t.minImportance;i=i.filter(d=>d.metadata.importance>=c)}if(t?.since){let c=t.since;i=i.filter(d=>d.metadata.createdAt>=c)}let a=i.map(c=>({cmu:c,score:this.calculateRetrievalScore(c,e),activation:c.metadata.baseActivation,source:"fts5"}));if(this.graph&&t?.projects?.length===1){let c=this.graph.retrieveContext(a.slice(0,5).map(d=>d.cmu.id),3);for(let d of c)if(!a.find(l=>l.cmu.id===d)){let l=await this.storage.getMemoryById(d);l&&a.push({cmu:l,score:this.calculateRetrievalScore(l,e)*.75,activation:l.metadata.baseActivation,source:"spreading"})}}return this.rankAndTrimResults(a,e,s)}async recordAccess(e){let t=Date.now();await this.storage.updateLastAccessed(e,t),await this.storage.incrementAccessCount(e);let s=await this.storage.getMemoryById(e);if(s){let n=G(s.metadata.accessCount+1,t,this.settings.actr.decayParameter);await this.storage.updateActivation(e,n)}this.lastSyncToken=null}async getMemoryById(e){return this.storage.getMemoryById(e)}async consolidate(){await this.ensureFreshGraph();let e=await this.storage.getAllMemories(),t=await Xe(e,{dedupeThreshold:this.settings.pruning.dedupeSimilarity,importanceThreshold:this.settings.pruning.importanceThreshold,maxAgeDays:this.settings.pruning.maxAgeDays,maxPerTier:Object.fromEntries(Object.entries(this.settings.tiers).map(([s,n])=>[s,n.maxCount]))});for(let s of e){let n=this.determineTier(s.content),o=this.normalizeImportance(s.content,n,s.memoryType,s.metadata.importance),i=this.settings.tiers[n]?.decay??s.metadata.decayRate;(n!==s.tier||Math.abs(o-s.metadata.importance)>.001||Math.abs(i-s.metadata.decayRate)>.001)&&await this.storage.updateQuality(s.id,n,o,i)}for(let[s,n]of Object.entries(t.associationsById))await this.storage.updateAssociations(s,n);for(let s of t.synthesized)await this.storage.storeMemory({id:"",sessionId:s.sessionId,project:s.project,tier:s.tier,memoryType:s.memoryType,content:s.content,metadata:{createdAt:Date.now(),lastAccessed:Date.now(),accessCount:1,importance:s.importance,baseActivation:G(1,Date.now(),this.settings.actr.decayParameter),decayRate:this.settings.tiers[s.tier]?.decay??.5},tags:[],associations:s.associations});for(let s of t.removedIds)await this.storage.deleteMemory(s);return await this.refreshGraph(),{merged:t.merged,pruned:t.pruned,linked:t.linked}}async getStats(){await this.ensureFreshGraph();let e=await this.storage.getAllMemories(),t={sensory:0,working:0,episodic:0,semantic:0,procedural:0},s=0,n=0,o=0,i=0,a=new Map;for(let c of e){t[c.tier]=(t[c.tier]||0)+1,s+=c.metadata.baseActivation,(c.tier==="semantic"||c.tier==="procedural")&&n++,c.tier==="sensory"&&o++,(c.content.title.startsWith("Knowledge:")||c.content.title.startsWith("Workflow:"))&&i++;for(let d of c.content.concepts.filter(l=>!l.startsWith("source:")))a.set(d,(a.get(d)??0)+1)}return{total:e.length,byTier:t,avgActivation:e.length>0?s/e.length:0,committed:n,evidence:o,distilled:i,topSignals:Array.from(a.entries()).sort((c,d)=>d[1]-c[1]).slice(0,5).map(([c])=>c)}}determineTier(e){let t=e.title.toLowerCase(),s=e.narrative.toLowerCase();return t.startsWith("tool: read")||t.startsWith("tool: glob")||t.startsWith("tool: grep")||t.startsWith("tool: search")||t.startsWith("tool: find")||t.startsWith("tool: ls")||t.startsWith("tool: list")||t.startsWith("tool: view")?"sensory":t.startsWith("tool:")||t.startsWith("procedure:")||t.startsWith("workflow:")||s.includes("step ")||s.includes("procedure")?"procedural":e.filesModified.length>0?"episodic":e.filesRead.length>5?"episodic":e.facts.length>0||e.concepts.length>=3?"semantic":e.narrative.length<160?"working":"episodic"}normalizeImportance(e,t,s,n){let o=n,i=e.title.toLowerCase(),a=e.narrative.toLowerCase();return t==="sensory"&&(o-=.25),t==="semantic"&&(o+=.15),t==="procedural"&&(o+=.1),e.filesModified.length>0&&(o+=.1),(s==="decision"||s==="change"||a.includes("root cause"))&&(o+=.1),qe.test(i)&&(o-=.15),Math.max(.1,Math.min(.98,o))}calculateRetrievalScore(e,t){let s=Os[e.tier]??1,n=W(e.metadata),o=this.keywordBonus(e,t),i=this.evidencePenalty(e,t);return n*s+o-i}keywordBonus(e,t){let s=t.toLowerCase().split(/\s+/).filter(Boolean);if(s.length===0)return 0;let n=e.content.title.toLowerCase(),o=e.content.narrative.toLowerCase(),i=e.content.concepts.map(c=>c.toLowerCase()),a=0;for(let c of s)n.includes(c)&&(a+=.45),i.some(d=>d.includes(c))&&(a+=.3),o.includes(c)&&(a+=.15);return a}evidencePenalty(e,t){let s=t.toLowerCase();return s.includes("why")||s.includes("where")||s.includes("evidence")||s.includes("trace")||s.includes("read")?0:e.tier==="sensory"?.8:qe.test(e.content.title.toLowerCase())?.45:0}rankAndTrimResults(e,t,s){let n=[...e].sort((d,l)=>l.score-d.score),o=[],i=new Set,a={},c=/\b(read|evidence|trace|raw|provenance)\b/i.test(t);for(let d of n){if(i.has(d.cmu.id))continue;let l=d.cmu.tier,p=a[l]??0;if(!(l==="sensory"&&!c&&p>=1)&&!(l==="working"&&p>=2)&&(i.add(d.cmu.id),a[l]=p+1,o.push(d),o.length>=s))break}return o}getSettings(){return this.settings}};function Ye(r,e){return new _e(r,e)}var Ee=C(require("path"),1);var J=require("fs"),K=C(require("path"),1),w={isWorktree:!1,worktreeName:null,parentRepoPath:null,parentProjectName:null};function Ve(r){let e=K.default.join(r,".git"),t;try{t=(0,J.statSync)(e)}catch{return w}if(!t.isFile())return w;let s;try{s=(0,J.readFileSync)(e,"utf-8").trim()}catch{return w}let n=s.match(/^gitdir:\s*(.+)$/);if(!n)return w;let i=n[1].match(/^(.+)[/\\]\.git[/\\]worktrees[/\\]([^/\\]+)$/);if(!i)return w;let a=i[1],c=K.default.basename(r),d=K.default.basename(a);return{isWorktree:!0,worktreeName:c,parentRepoPath:a,parentProjectName:d}}function fe(r){return r.replace(/\\/g,"/").replace(/\/+/g,"/").replace(/\/$/,"")}function Ke(r){return fe(r).split("/").filter(Boolean)}function ge(r){if(!r||r.trim()==="")return u.warn("PROJECT_NAME","Empty cwd provided, using fallback",{cwd:r}),"unknown-project";let e=Ee.default.basename(r);if(e===""){if(process.platform==="win32"){let s=r.match(/^([A-Z]):\\/i);if(s){let o=`drive-${s[1].toUpperCase()}`;return u.info("PROJECT_NAME","Drive root detected",{cwd:r,projectName:o}),o}}return u.warn("PROJECT_NAME","Root directory detected, using fallback",{cwd:r}),"unknown-project"}return e}function As(r){if(!r||r.trim()==="")return ge(r);let e=fe(Ee.default.resolve(r)),t=Ke(e);return t.length===0?ge(r):t.length===1?t[0]:`${t[t.length-2]}/${t[t.length-1]}`}function z(r){if(!r||r.trim()==="")return["unknown-project"];let e=fe(r.trim()),t=Ke(e),s=new Set([e]);return t.length>0&&s.add(t[t.length-1]),t.length>1&&s.add(`${t[t.length-2]}/${t[t.length-1]}`),Array.from(s)}function Je(r){let e=ge(r),t=As(r);if(!r)return{primary:e,canonical:t,parent:null,isWorktree:!1,allProjects:z(t)};let s=Ve(r);if(s.isWorktree&&s.parentProjectName){let n=new Set([...z(t),...z(s.parentProjectName),e]);return{primary:t,canonical:t,parent:s.parentProjectName,isWorktree:!0,allProjects:Array.from(n)}}return{primary:t,canonical:t,parent:null,isWorktree:!1,allProjects:z(t)}}var Qe=C(require("path"),1),Ze=require("os");var O=require("fs"),Z=require("path"),ze=require("os"),Q=class{static DEFAULTS={AI_MEM_MODEL:"claude-sonnet-4-5",AI_MEM_CONTEXT_OBSERVATIONS:"50",AI_MEM_WORKER_PORT:"37777",AI_MEM_WORKER_HOST:"127.0.0.1",AI_MEM_SKIP_TOOLS:"ListMcpResourcesTool,SlashCommand,Skill,TodoWrite,AskUserQuestion",AI_MEM_PROVIDER:"claude",AI_MEM_CLAUDE_AUTH_METHOD:"cli",AI_MEM_GEMINI_API_KEY:"",AI_MEM_GEMINI_MODEL:"gemini-2.5-flash-lite",AI_MEM_GEMINI_RATE_LIMITING_ENABLED:"true",AI_MEM_OPENROUTER_API_KEY:"",AI_MEM_OPENROUTER_MODEL:"xiaomi/mimo-v2-flash:free",AI_MEM_OPENROUTER_SITE_URL:"",AI_MEM_OPENROUTER_APP_NAME:"ai-mem",AI_MEM_OPENROUTER_MAX_CONTEXT_MESSAGES:"20",AI_MEM_OPENROUTER_MAX_TOKENS:"100000",AI_MEM_DATA_DIR:(0,Z.join)((0,ze.homedir)(),".ai-mem"),AI_MEM_LOG_LEVEL:"INFO",AI_MEM_PYTHON_VERSION:"3.13",CLAUDE_CODE_PATH:"",AI_MEM_MODE:"code",AI_MEM_CONTEXT_SHOW_READ_TOKENS:"false",AI_MEM_CONTEXT_SHOW_WORK_TOKENS:"false",AI_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT:"false",AI_MEM_CONTEXT_SHOW_SAVINGS_PERCENT:"true",AI_MEM_CONTEXT_FULL_COUNT:"0",AI_MEM_CONTEXT_FULL_FIELD:"narrative",AI_MEM_CONTEXT_SESSION_COUNT:"10",AI_MEM_CONTEXT_SHOW_LAST_SUMMARY:"true",AI_MEM_CONTEXT_SHOW_LAST_MESSAGE:"false",AI_MEM_CONTEXT_SHOW_TERMINAL_OUTPUT:"true",AI_MEM_FOLDER_CLAUDEMD_ENABLED:"false",AI_MEM_MAX_CONCURRENT_AGENTS:"2",AI_MEM_EXCLUDED_PROJECTS:"",AI_MEM_FOLDER_MD_EXCLUDE:"[]",AI_MEM_CHROMA_ENABLED:"true",AI_MEM_CHROMA_MODE:"local",AI_MEM_CHROMA_HOST:"127.0.0.1",AI_MEM_CHROMA_PORT:"8000",AI_MEM_CHROMA_SSL:"false",AI_MEM_CHROMA_API_KEY:"",AI_MEM_CHROMA_TENANT:"default_tenant",AI_MEM_CHROMA_DATABASE:"default_database"};static getAllDefaults(){return{...this.DEFAULTS}}static get(e){return process.env[e]??this.DEFAULTS[e]}static getInt(e){let t=this.get(e);return parseInt(t,10)}static getBool(e){return this.get(e)==="true"}static applyEnvOverrides(e){let t={...e};for(let s of Object.keys(this.DEFAULTS))process.env[s]!==void 0&&(t[s]=process.env[s]);return t}static loadFromFile(e){try{if(!(0,O.existsSync)(e)){let i=this.getAllDefaults();try{let a=(0,Z.dirname)(e);(0,O.existsSync)(a)||(0,O.mkdirSync)(a,{recursive:!0}),(0,O.writeFileSync)(e,JSON.stringify(i,null,2),"utf-8"),console.log("[SETTINGS] Created settings file with defaults:",e)}catch(a){console.warn("[SETTINGS] Failed to create settings file, using in-memory defaults:",e,a)}return this.applyEnvOverrides(i)}let t=(0,O.readFileSync)(e,"utf-8"),s=JSON.parse(t),n=s;if(s.env&&typeof s.env=="object"){n=s.env;try{(0,O.writeFileSync)(e,JSON.stringify(n,null,2),"utf-8"),console.log("[SETTINGS] Migrated settings file from nested to flat schema:",e)}catch(i){console.warn("[SETTINGS] Failed to auto-migrate settings file:",e,i)}}let o={...this.DEFAULTS};for(let i of Object.keys(this.DEFAULTS))n[i]!==void 0&&(o[i]=n[i]);return this.applyEnvOverrides(o)}catch(t){return console.warn("[SETTINGS] Failed to load settings, using defaults:",e,t),this.applyEnvOverrides(this.getAllDefaults())}}};var k=require("fs"),ee=require("path");var R=class r{static instance=null;activeMode=null;modesDir;constructor(){let e=ke(),t=[(0,ee.join)(e,"modes"),(0,ee.join)(e,"..","plugin","modes")],s=t.find(n=>(0,k.existsSync)(n));this.modesDir=s||t[0]}static getInstance(){return r.instance||(r.instance=new r),r.instance}parseInheritance(e){let t=e.split("--");if(t.length===1)return{hasParent:!1,parentId:"",overrideId:""};if(t.length>2)throw new Error(`Invalid mode inheritance: ${e}. Only one level of inheritance supported (parent--override)`);return{hasParent:!0,parentId:t[0],overrideId:e}}isPlainObject(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}deepMerge(e,t){let s={...e};for(let n in t){let o=t[n],i=e[n];this.isPlainObject(o)&&this.isPlainObject(i)?s[n]=this.deepMerge(i,o):s[n]=o}return s}loadModeFile(e){let t=(0,ee.join)(this.modesDir,`${e}.json`);if(!(0,k.existsSync)(t))throw new Error(`Mode file not found: ${t}`);let s=(0,k.readFileSync)(t,"utf-8");return JSON.parse(s)}loadMode(e){let t=this.parseInheritance(e);if(!t.hasParent)try{let c=this.loadModeFile(e);return this.activeMode=c,u.debug("SYSTEM",`Loaded mode: ${c.name} (${e})`,void 0,{types:c.observation_types.map(d=>d.id),concepts:c.observation_concepts.map(d=>d.id)}),c}catch{if(u.warn("SYSTEM",`Mode file not found: ${e}, falling back to 'code'`),e==="code")throw new Error("Critical: code.json mode file missing");return this.loadMode("code")}let{parentId:s,overrideId:n}=t,o;try{o=this.loadMode(s)}catch{u.warn("SYSTEM",`Parent mode '${s}' not found for ${e}, falling back to 'code'`),o=this.loadMode("code")}let i;try{i=this.loadModeFile(n),u.debug("SYSTEM",`Loaded override file: ${n} for parent ${s}`)}catch{return u.warn("SYSTEM",`Override file '${n}' not found, using parent mode '${s}' only`),this.activeMode=o,o}if(!i)return u.warn("SYSTEM",`Invalid override file: ${n}, using parent mode '${s}' only`),this.activeMode=o,o;let a=this.deepMerge(o,i);return this.activeMode=a,u.debug("SYSTEM",`Loaded mode with inheritance: ${a.name} (${e} = ${s} + ${n})`,void 0,{parent:s,override:n,types:a.observation_types.map(c=>c.id),concepts:a.observation_concepts.map(c=>c.id)}),a}getActiveMode(){if(!this.activeMode)throw new Error("No mode loaded. Call loadMode() first.");return this.activeMode}getObservationTypes(){return this.getActiveMode().observation_types}getObservationConcepts(){return this.getActiveMode().observation_concepts}getTypeIcon(e){return this.getObservationTypes().find(s=>s.id===e)?.emoji||"\u{1F4DD}"}getWorkEmoji(e){return this.getObservationTypes().find(s=>s.id===e)?.work_emoji||"\u{1F4DD}"}validateType(e){return this.getObservationTypes().some(t=>t.id===e)}getTypeLabel(e){return this.getObservationTypes().find(s=>s.id===e)?.label||e}};function Te(){let r=Qe.default.join((0,Ze.homedir)(),".ai-mem","settings.json"),e=Q.loadFromFile(r),t=R.getInstance().getActiveMode(),s=new Set(t.observation_types.map(o=>o.id)),n=new Set(t.observation_concepts.map(o=>o.id));return{totalObservationCount:parseInt(e.AI_MEM_CONTEXT_OBSERVATIONS,10),fullObservationCount:parseInt(e.AI_MEM_CONTEXT_FULL_COUNT,10),sessionCount:parseInt(e.AI_MEM_CONTEXT_SESSION_COUNT,10),showReadTokens:e.AI_MEM_CONTEXT_SHOW_READ_TOKENS==="true",showWorkTokens:e.AI_MEM_CONTEXT_SHOW_WORK_TOKENS==="true",showSavingsAmount:e.AI_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT==="true",showSavingsPercent:e.AI_MEM_CONTEXT_SHOW_SAVINGS_PERCENT==="true",observationTypes:s,observationConcepts:n,fullObservationField:e.AI_MEM_CONTEXT_FULL_FIELD,showLastSummary:e.AI_MEM_CONTEXT_SHOW_LAST_SUMMARY==="true",showLastMessage:e.AI_MEM_CONTEXT_SHOW_LAST_MESSAGE==="true"}}var m={reset:"\x1B[0m",bright:"\x1B[1m",dim:"\x1B[2m",cyan:"\x1B[36m",green:"\x1B[32m",yellow:"\x1B[33m",blue:"\x1B[34m",magenta:"\x1B[35m",gray:"\x1B[90m",red:"\x1B[31m"},et=4,he=1;function be(r){let e=(r.title?.length||0)+(r.subtitle?.length||0)+(r.narrative?.length||0)+JSON.stringify(r.facts||[]).length;return Math.ceil(e/et)}function Se(r){let e=r.length,t=r.reduce((i,a)=>i+be(a),0),s=r.reduce((i,a)=>i+(a.discovery_tokens||0),0),n=s-t,o=s>0?Math.round(n/s*100):0;return{totalObservations:e,totalReadTokens:t,totalDiscoveryTokens:s,savings:n,savingsPercent:o}}function Cs(r){return R.getInstance().getWorkEmoji(r)}function U(r,e){let t=be(r),s=r.discovery_tokens||0,n=Cs(r.type),o=s>0?`${n} ${s.toLocaleString()}`:"-";return{readTokens:t,discoveryTokens:s,discoveryDisplay:o,workEmoji:n}}function te(r){return r.showReadTokens||r.showWorkTokens||r.showSavingsAmount||r.showSavingsPercent}var tt=C(require("path"),1),se=require("fs");function ye(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(",");return r.db.prepare(`
    SELECT
      id, memory_session_id, type, title, subtitle, narrative,
      facts, concepts, files_read, files_modified, discovery_tokens,
      created_at, created_at_epoch
    FROM observations
    WHERE project = ?
      AND type IN (${n})
      AND EXISTS (
        SELECT 1 FROM json_each(concepts)
        WHERE value IN (${i})
      )
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(e,...s,...o,t.totalObservationCount)}function Re(r,e,t){return r.db.prepare(`
    SELECT id, memory_session_id, request, investigated, learned, completed, next_steps, created_at, created_at_epoch
    FROM session_summaries
    WHERE project = ?
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(e,t.sessionCount+he)}function st(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(","),a=e.map(()=>"?").join(",");return r.db.prepare(`
    SELECT
      id, memory_session_id, type, title, subtitle, narrative,
      facts, concepts, files_read, files_modified, discovery_tokens,
      created_at, created_at_epoch, project
    FROM observations
    WHERE project IN (${a})
      AND type IN (${n})
      AND EXISTS (
        SELECT 1 FROM json_each(concepts)
        WHERE value IN (${i})
      )
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(...e,...s,...o,t.totalObservationCount)}function rt(r,e,t){let s=e.map(()=>"?").join(",");return r.db.prepare(`
    SELECT id, memory_session_id, request, investigated, learned, completed, next_steps, created_at, created_at_epoch, project
    FROM session_summaries
    WHERE project IN (${s})
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(...e,t.sessionCount+he)}function Ns(r){return r.replace(/\//g,"-")}function Ds(r){try{if(!(0,se.existsSync)(r))return{userMessage:"",assistantMessage:""};let e=(0,se.readFileSync)(r,"utf-8").trim();if(!e)return{userMessage:"",assistantMessage:""};let t=e.split(`
`).filter(n=>n.trim()),s="";for(let n=t.length-1;n>=0;n--)try{let o=t[n];if(!o.includes('"type":"assistant"'))continue;let i=JSON.parse(o);if(i.type==="assistant"&&i.message?.content&&Array.isArray(i.message.content)){let a="";for(let c of i.message.content)c.type==="text"&&(a+=c.text);if(a=a.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g,"").trim(),a){s=a;break}}}catch(o){u.debug("PARSER","Skipping malformed transcript line",{lineIndex:n},o);continue}return{userMessage:"",assistantMessage:s}}catch(e){return u.failure("WORKER","Failed to extract prior messages from transcript",{transcriptPath:r},e),{userMessage:"",assistantMessage:""}}}function ve(r,e,t,s){if(!e.showLastMessage||r.length===0)return{userMessage:"",assistantMessage:""};let n=r.find(c=>c.memory_session_id!==t);if(!n)return{userMessage:"",assistantMessage:""};let o=n.memory_session_id,i=Ns(s),a=tt.default.join(D,"projects",i,`${o}.jsonl`);return Ds(a)}function nt(r,e){let t=e[0]?.id;return r.map((s,n)=>{let o=n===0?null:e[n+1];return{...s,displayEpoch:o?o.created_at_epoch:s.created_at_epoch,displayTime:o?o.created_at:s.created_at,shouldShowLink:s.id!==t}})}function Ie(r,e){let t=[...r.map(s=>({type:"observation",data:s})),...e.map(s=>({type:"summary",data:s}))];return t.sort((s,n)=>{let o=s.type==="observation"?s.data.created_at_epoch:s.data.displayEpoch,i=n.type==="observation"?n.data.created_at_epoch:n.data.displayEpoch;return o-i}),t}function ot(r,e){return new Set(r.slice(0,e).map(t=>t.id))}function it(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function at(r){return[`# $CMEM ${r} ${it()}`,""]}function ct(){return[`Legend: \u{1F3AF}session ${R.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji}${t.id}`).join(" ")}`,"Format: ID TIME TYPE TITLE","Fetch details: get_observations([IDs]) | Search: mem-search skill",""]}function dt(){return[]}function lt(){return[]}function mt(r,e){let t=[],s=[`${r.totalObservations} obs (${r.totalReadTokens.toLocaleString()}t read)`,`${r.totalDiscoveryTokens.toLocaleString()}t work`];return r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)&&(e.showSavingsPercent?s.push(`${r.savingsPercent}% savings`):e.showSavingsAmount&&s.push(`${r.savings.toLocaleString()}t saved`)),t.push(`Stats: ${s.join(" | ")}`),t.push(""),t}function ut(r){return[`### ${r}`]}function pt(r){return r.toLowerCase().replace(" am","a").replace(" pm","p")}function _t(r,e,t){let s=r.title||"Untitled",n=R.getInstance().getTypeIcon(r.type),o=e?pt(e):'"';return`${r.id} ${o} ${n} ${s}`}function gt(r,e,t,s){let n=[],o=r.title||"Untitled",i=R.getInstance().getTypeIcon(r.type),a=e?pt(e):'"',{readTokens:c,discoveryDisplay:d}=U(r,s);n.push(`**${r.id}** ${a} ${i} **${o}**`),t&&n.push(t);let l=[];return s.showReadTokens&&l.push(`~${c}t`),s.showWorkTokens&&l.push(d),l.length>0&&n.push(l.join(" ")),n.push(""),n}function Et(r,e){return[`S${r.id} ${r.request||"Session started"} (${e})`]}function $(r,e){return e?[`**${r}**: ${e}`,""]:[]}function ft(r){return r.assistantMessage?["","---","","**Previously**","",`A: ${r.assistantMessage}`,""]:[]}function Tt(r,e){return["",`Access ${Math.round(r/1e3)}k tokens of past work via get_observations([IDs]) or mem-search skill.`]}function ht(r){return`# $CMEM ${r} ${it()}

No previous sessions found.`}function bt(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function St(r){return["",`${m.bright}${m.cyan}[${r}] recent context, ${bt()}${m.reset}`,`${m.gray}${"\u2500".repeat(60)}${m.reset}`,""]}function yt(){let e=R.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji} ${t.id}`).join(" | ");return[`${m.dim}Legend: session-request | ${e}${m.reset}`,""]}function Rt(){return[`${m.bright}Column Key${m.reset}`,`${m.dim}  Read: Tokens to read this observation (cost to learn it now)${m.reset}`,`${m.dim}  Work: Tokens spent on work that produced this record ( research, building, deciding)${m.reset}`,""]}function vt(){return[`${m.dim}Context Index: This semantic index (titles, types, files, tokens) is usually sufficient to understand past work.${m.reset}`,"",`${m.dim}When you need implementation details, rationale, or debugging context:${m.reset}`,`${m.dim}  - Fetch by ID: get_observations([IDs]) for observations visible in this index${m.reset}`,`${m.dim}  - Search history: Use the mem-search skill for past decisions, bugs, and deeper research${m.reset}`,`${m.dim}  - Trust this index over re-reading code for past decisions and learnings${m.reset}`,""]}function It(r,e){let t=[];if(t.push(`${m.bright}${m.cyan}Context Economics${m.reset}`),t.push(`${m.dim}  Loading: ${r.totalObservations} observations (${r.totalReadTokens.toLocaleString()} tokens to read)${m.reset}`),t.push(`${m.dim}  Work investment: ${r.totalDiscoveryTokens.toLocaleString()} tokens spent on research, building, and decisions${m.reset}`),r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)){let s="  Your savings: ";e.showSavingsAmount&&e.showSavingsPercent?s+=`${r.savings.toLocaleString()} tokens (${r.savingsPercent}% reduction from reuse)`:e.showSavingsAmount?s+=`${r.savings.toLocaleString()} tokens`:s+=`${r.savingsPercent}% reduction from reuse`,t.push(`${m.green}${s}${m.reset}`)}return t.push(""),t}function Ot(r){return[`${m.bright}${m.cyan}${r}${m.reset}`,""]}function Mt(r){return[`${m.dim}${r}${m.reset}`]}function At(r,e,t,s){let n=r.title||"Untitled",o=R.getInstance().getTypeIcon(r.type),{readTokens:i,discoveryTokens:a,workEmoji:c}=U(r,s),d=t?`${m.dim}${e}${m.reset}`:" ".repeat(e.length),l=s.showReadTokens&&i>0?`${m.dim}(~${i}t)${m.reset}`:"",p=s.showWorkTokens&&a>0?`${m.dim}(${c} ${a.toLocaleString()}t)${m.reset}`:"";return`  ${m.dim}#${r.id}${m.reset}  ${d}  ${o}  ${n} ${l} ${p}`}function Ct(r,e,t,s,n){let o=[],i=r.title||"Untitled",a=R.getInstance().getTypeIcon(r.type),{readTokens:c,discoveryTokens:d,workEmoji:l}=U(r,n),p=t?`${m.dim}${e}${m.reset}`:" ".repeat(e.length),f=n.showReadTokens&&c>0?`${m.dim}(~${c}t)${m.reset}`:"",T=n.showWorkTokens&&d>0?`${m.dim}(${l} ${d.toLocaleString()}t)${m.reset}`:"";return o.push(`  ${m.dim}#${r.id}${m.reset}  ${p}  ${a}  ${m.bright}${i}${m.reset}`),s&&o.push(`    ${m.dim}${s}${m.reset}`),(f||T)&&o.push(`    ${f} ${T}`),o.push(""),o}function Nt(r,e){let t=`${r.request||"Session started"} (${e})`;return[`${m.yellow}#S${r.id}${m.reset} ${t}`,""]}function P(r,e,t){return e?[`${t}${r}:${m.reset} ${e}`,""]:[]}function Dt(r){return r.assistantMessage?["","---","",`${m.bright}${m.magenta}Previously${m.reset}`,"",`${m.dim}A: ${r.assistantMessage}${m.reset}`,""]:[]}function Lt(r,e){let t=Math.round(r/1e3);return["",`${m.dim}Access ${t}k tokens of past research & decisions for just ${e.toLocaleString()}t. Use the claude-mem skill to access memories by ID.${m.reset}`]}function xt(r){return`
${m.bright}${m.cyan}[${r}] recent context, ${bt()}${m.reset}
${m.gray}${"\u2500".repeat(60)}${m.reset}

${m.dim}No previous sessions found for this project yet.${m.reset}
`}function wt(r,e,t,s){let n=[];return s?n.push(...St(r)):n.push(...at(r)),s?n.push(...yt()):n.push(...ct()),s?n.push(...Rt()):n.push(...dt()),s?n.push(...vt()):n.push(...lt()),te(t)&&(s?n.push(...It(e,t)):n.push(...mt(e,t))),n}var Oe=C(require("path"),1);function oe(r){if(!r)return[];try{let e=JSON.parse(r);return Array.isArray(e)?e:[]}catch(e){return u.debug("PARSER","Failed to parse JSON array, using empty fallback",{preview:r?.substring(0,50)},e),[]}}function Me(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:!0})}function Ae(r){return new Date(r).toLocaleString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0})}function Ut(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric"})}function kt(r,e){return Oe.default.isAbsolute(r)?Oe.default.relative(e,r):r}function $t(r,e,t){let s=oe(r);if(s.length>0)return kt(s[0],e);if(t){let n=oe(t);if(n.length>0)return kt(n[0],e)}return"General"}function Ls(r){let e=new Map;for(let s of r){let n=s.type==="observation"?s.data.created_at:s.data.displayTime,o=Ut(n);e.has(o)||e.set(o,[]),e.get(o).push(s)}let t=Array.from(e.entries()).sort((s,n)=>{let o=new Date(s[0]).getTime(),i=new Date(n[0]).getTime();return o-i});return new Map(t)}function Pt(r,e){return e.fullObservationField==="narrative"?r.narrative:r.facts?oe(r.facts).join(`
`):null}function xs(r,e,t,s){let n=[];n.push(...ut(r));let o="";for(let i of e)if(i.type==="summary"){o="";let a=i.data,c=Me(a.displayTime);n.push(...Et(a,c))}else{let a=i.data,c=Ae(a.created_at),l=c!==o?c:"";if(o=c,t.has(a.id)){let f=Pt(a,s);n.push(...gt(a,l,f,s))}else n.push(_t(a,l,s))}return n}function ws(r,e,t,s,n){let o=[];o.push(...Ot(r));let i=null,a="";for(let c of e)if(c.type==="summary"){i=null,a="";let d=c.data,l=Me(d.displayTime);o.push(...Nt(d,l))}else{let d=c.data,l=$t(d.files_modified,n,d.files_read),p=Ae(d.created_at),f=p!==a;a=p;let T=t.has(d.id);if(l!==i&&(o.push(...Mt(l)),i=l),T){let b=Pt(d,s);o.push(...Ct(d,p,f,b,s))}else o.push(At(d,p,f,s))}return o.push(""),o}function ks(r,e,t,s,n,o){return o?ws(r,e,t,s,n):xs(r,e,t,s)}function jt(r,e,t,s,n){let o=[],i=Ls(r);for(let[a,c]of i)o.push(...ks(a,c,e,t,s,n));return o}function Ft(r,e,t){return!(!r.showLastSummary||!e||!!!(e.investigated||e.learned||e.completed||e.next_steps)||t&&e.created_at_epoch<=t.created_at_epoch)}function Bt(r,e){let t=[];return e?(t.push(...P("Investigated",r.investigated,m.blue)),t.push(...P("Learned",r.learned,m.yellow)),t.push(...P("Completed",r.completed,m.green)),t.push(...P("Next Steps",r.next_steps,m.magenta))):(t.push(...$("Investigated",r.investigated)),t.push(...$("Learned",r.learned)),t.push(...$("Completed",r.completed)),t.push(...$("Next Steps",r.next_steps))),t}function Xt(r,e){return e?Dt(r):ft(r)}function Gt(r,e,t){return!te(e)||r.totalDiscoveryTokens<=0||r.savings<=0?[]:t?Lt(r.totalDiscoveryTokens,r.totalReadTokens):Tt(r.totalDiscoveryTokens,r.totalReadTokens)}var Us=Wt.default.join((0,Ht.homedir)(),".claude","plugins","marketplaces","thedotmack","plugin",".install-version");function $s(){try{return new X}catch(r){if(r.code==="ERR_DLOPEN_FAILED"){try{(0,qt.unlinkSync)(Us)}catch(e){u.debug("SYSTEM","Marker file cleanup failed (may not exist)",{},e)}return u.error("SYSTEM","Native module rebuild needed - restart Claude Code to auto-fix"),null}throw r}}function Ps(r,e){return e?xt(r):ht(r)}function js(r,e,t,s,n,o,i,a,c){let d=[],l=Se(e);d.push(...wt(r,l,o,c));let p=t.slice(0,o.sessionCount),f=nt(p,t),T=Ie(e,f),b=ot(e,o.fullObservationCount);d.push(...jt(T,b,o,i,c));let S=t[0],E=e[0];if(Ft(o,S,E)&&d.push(...Bt(S,c)),s.length>0){d.push(c?"Committed Project Memory":"## Committed Project Memory"),d.push(""),d.push("Use these as stable project knowledge and established workflows. Prefer them over raw historical detail unless you need provenance."),d.push("");for(let g of s.slice(0,6))d.push(`- [${g.tier}] ${g.title}: ${g.narrative.slice(0,180)}`);d.push("")}if(n.length>0){d.push(c?"Relevant Episodic Evidence":"## Relevant Episodic Evidence"),d.push("");for(let g of n.slice(0,3))d.push(`- [${g.tier}] ${g.title}: ${g.narrative.slice(0,140)}`);d.push("")}let _=ve(e,o,a,i);return d.push(...Xt(_,c)),d.push(...Gt(l,o,c)),d.join(`
`).trimEnd()}async function Ce(r,e=!1){let t=Te(),s=r?.cwd??process.cwd(),n=Je(s),o=n.canonical,i=r?.projects||n.allProjects;r?.full&&(t.totalObservationCount=999999,t.sessionCount=999999);let a=$s();if(!a)return"";try{let c=Ye(a.db);await c.initialize();let d=i.length>1?st(a,i,t):ye(a,o,t),l=i.length>1?rt(a,i,t):Re(a,o,t),p=await c.retrieveMemories("",{projects:i,tiers:["semantic","procedural"]},8).then(b=>b.map(S=>({tier:S.cmu.tier,title:S.cmu.content.title,narrative:S.cmu.content.narrative}))),f=await c.retrieveMemories("",{projects:i,tiers:["episodic"]},4).then(b=>b.map(S=>({tier:S.cmu.tier,title:S.cmu.content.title,narrative:S.cmu.content.narrative})));return d.length===0&&l.length===0&&p.length===0&&f.length===0?Ps(o,e):js(o,d,l,p,f,t,s,r?.session_id,e)}finally{a.close()}}0&&(module.exports={generateContext});
