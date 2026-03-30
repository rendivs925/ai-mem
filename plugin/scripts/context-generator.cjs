"use strict";var Xt=Object.create;var P=Object.defineProperty;var Gt=Object.getOwnPropertyDescriptor;var Ht=Object.getOwnPropertyNames;var Wt=Object.getPrototypeOf,qt=Object.prototype.hasOwnProperty;var Yt=(r,e)=>{for(var t in e)P(r,t,{get:e[t],enumerable:!0})},Ie=(r,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of Ht(e))!qt.call(r,n)&&n!==t&&P(r,n,{get:()=>e[n],enumerable:!(s=Gt(e,n))||s.enumerable});return r};var v=(r,e,t)=>(t=r!=null?Xt(Wt(r)):{},Ie(e||!r||!r.__esModule?P(t,"default",{value:r,enumerable:!0}):t,r)),Vt=r=>Ie(P({},"__esModule",{value:!0}),r);var Ts={};Yt(Ts,{generateContext:()=>Re});module.exports=Vt(Ts);var $t=v(require("path"),1),Ft=require("os"),jt=require("fs");var xe=require("bun:sqlite");var h=require("path"),ne=require("os"),$=require("fs");var Me=require("url");var A=require("fs"),L=require("path"),ve=require("os"),se=(o=>(o[o.DEBUG=0]="DEBUG",o[o.INFO=1]="INFO",o[o.WARN=2]="WARN",o[o.ERROR=3]="ERROR",o[o.SILENT=4]="SILENT",o))(se||{}),Ae=(0,L.join)((0,ve.homedir)(),".ai-mem"),re=class{level=null;useColor;logFilePath=null;logFileInitialized=!1;constructor(){this.useColor=process.stdout.isTTY??!1}ensureLogFileInitialized(){if(!this.logFileInitialized){this.logFileInitialized=!0;try{let e=(0,L.join)(Ae,"logs");(0,A.existsSync)(e)||(0,A.mkdirSync)(e,{recursive:!0});let t=new Date().toISOString().split("T")[0];this.logFilePath=(0,L.join)(e,`claude-mem-${t}.log`)}catch(e){console.error("[LOGGER] Failed to initialize log file:",e),this.logFilePath=null}}}getLevel(){if(this.level===null)try{let e=(0,L.join)(Ae,"settings.json");if((0,A.existsSync)(e)){let t=(0,A.readFileSync)(e,"utf-8"),n=(JSON.parse(t).AI_MEM_LOG_LEVEL||"INFO").toUpperCase();this.level=se[n]??1}else this.level=1}catch{this.level=1}return this.level}correlationId(e,t){return`obs-${e}-${t}`}sessionId(e){return`session-${e}`}formatData(e){if(e==null)return"";if(typeof e=="string")return e;if(typeof e=="number"||typeof e=="boolean")return e.toString();if(typeof e=="object"){if(e instanceof Error)return this.getLevel()===0?`${e.message}
${e.stack}`:e.message;if(Array.isArray(e))return`[${e.length} items]`;let t=Object.keys(e);return t.length===0?"{}":t.length<=3?JSON.stringify(e):`{${t.length} keys: ${t.slice(0,3).join(", ")}...}`}return String(e)}formatTool(e,t){if(!t)return e;let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{s=t}if(e==="Bash"&&s.command)return`${e}(${s.command})`;if(s.file_path)return`${e}(${s.file_path})`;if(s.notebook_path)return`${e}(${s.notebook_path})`;if(e==="Glob"&&s.pattern)return`${e}(${s.pattern})`;if(e==="Grep"&&s.pattern)return`${e}(${s.pattern})`;if(s.url)return`${e}(${s.url})`;if(s.query)return`${e}(${s.query})`;if(e==="Task"){if(s.subagent_type)return`${e}(${s.subagent_type})`;if(s.description)return`${e}(${s.description})`}return e==="Skill"&&s.skill?`${e}(${s.skill})`:e==="LSP"&&s.operation?`${e}(${s.operation})`:e}formatTimestamp(e){let t=e.getFullYear(),s=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0"),a=String(e.getSeconds()).padStart(2,"0"),d=String(e.getMilliseconds()).padStart(3,"0");return`${t}-${s}-${n} ${o}:${i}:${a}.${d}`}log(e,t,s,n,o){if(e<this.getLevel())return;this.ensureLogFileInitialized();let i=this.formatTimestamp(new Date),a=se[e].padEnd(5),d=t.padEnd(6),c="";n?.correlationId?c=`[${n.correlationId}] `:n?.sessionId&&(c=`[session-${n.sessionId}] `);let u="";o!=null&&(o instanceof Error?u=this.getLevel()===0?`
${o.message}
${o.stack}`:` ${o.message}`:this.getLevel()===0&&typeof o=="object"?u=`
`+JSON.stringify(o,null,2):u=" "+this.formatData(o));let _="";if(n){let{sessionId:g,memorySessionId:f,correlationId:y,...p}=n;Object.keys(p).length>0&&(_=` {${Object.entries(p).map(([b,S])=>`${b}=${S}`).join(", ")}}`)}let T=`[${i}] [${a}] [${d}] ${c}${s}${_}${u}`;if(this.logFilePath)try{(0,A.appendFileSync)(this.logFilePath,T+`
`,"utf8")}catch(g){process.stderr.write(`[LOGGER] Failed to write to log file: ${g}
`)}else process.stderr.write(T+`
`)}debug(e,t,s,n){this.log(0,e,t,s,n)}info(e,t,s,n){this.log(1,e,t,s,n)}warn(e,t,s,n){this.log(2,e,t,s,n)}error(e,t,s,n){this.log(3,e,t,s,n)}dataIn(e,t,s,n){this.info(e,`\u2192 ${t}`,s,n)}dataOut(e,t,s,n){this.info(e,`\u2190 ${t}`,s,n)}success(e,t,s,n){this.info(e,`\u2713 ${t}`,s,n)}failure(e,t,s,n){this.error(e,`\u2717 ${t}`,s,n)}timing(e,t,s,n){this.info(e,`\u23F1 ${t}`,n,{duration:`${s}ms`})}happyPathError(e,t,s,n,o=""){let c=((new Error().stack||"").split(`
`)[2]||"").match(/at\s+(?:.*\s+)?\(?([^:]+):(\d+):(\d+)\)?/),u=c?`${c[1].split("/").pop()}:${c[2]}`:"unknown",_={...s,location:u};return this.warn(e,`[HAPPY-PATH] ${t}`,_,n),o}},l=new re;var Qt={};function Kt(){return typeof __dirname<"u"?__dirname:(0,h.dirname)((0,Me.fileURLToPath)(Qt.url))}var Jt=Kt();function zt(){if(process.env.AI_MEM_DATA_DIR)return process.env.AI_MEM_DATA_DIR;let r=(0,h.join)((0,ne.homedir)(),".ai-mem"),e=(0,h.join)(r,"settings.json");try{if((0,$.existsSync)(e)){let{readFileSync:t}=require("fs"),s=JSON.parse(t(e,"utf-8")),n=s.env??s;if(n.AI_MEM_DATA_DIR)return n.AI_MEM_DATA_DIR}}catch{}return r}var R=zt(),M=process.env.CLAUDE_CONFIG_DIR||(0,h.join)((0,ne.homedir)(),".claude"),ys=(0,h.join)(M,"plugins","marketplaces","thedotmack"),Os=(0,h.join)(R,"archives"),Rs=(0,h.join)(R,"logs"),Is=(0,h.join)(R,"trash"),As=(0,h.join)(R,"backups"),vs=(0,h.join)(R,"modes"),Ms=(0,h.join)(R,"settings.json"),Ne=(0,h.join)(R,"claude-mem.db"),Ns=(0,h.join)(R,"vector-db"),Cs=(0,h.join)(R,"observer-sessions"),Ls=(0,h.join)(M,"settings.json"),Ds=(0,h.join)(M,"commands"),xs=(0,h.join)(M,"CLAUDE.md");function Ce(r){(0,$.mkdirSync)(r,{recursive:!0})}function Le(){return(0,h.join)(Jt,"..")}var De=require("crypto");var Zt=3e4;function N(r,e,t){return(0,De.createHash)("sha256").update((r||"")+(e||"")+(t||"")).digest("hex").slice(0,16)}function F(r,e,t){let s=t-Zt;return r.prepare("SELECT id, created_at_epoch FROM observations WHERE content_hash = ? AND created_at_epoch > ?").get(e,s)}var j=class{db;constructor(e=Ne){e!==":memory:"&&Ce(R),this.db=new xe.Database(e),this.db.run("PRAGMA journal_mode = WAL"),this.db.run("PRAGMA synchronous = NORMAL"),this.db.run("PRAGMA foreign_keys = ON"),this.db.run("PRAGMA busy_timeout = 5000"),this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.repairSessionIdColumnRename(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addObservationContentHashColumn(),this.addSessionCustomTitleColumn()}initializeSchema(){this.db.run(`
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
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(4,new Date().toISOString())}ensureWorkerPortColumn(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(s=>s.name==="worker_port")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN worker_port INTEGER"),l.debug("DB","Added worker_port column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(5,new Date().toISOString())}ensurePromptTrackingColumns(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(a=>a.name==="prompt_counter")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN prompt_counter INTEGER DEFAULT 0"),l.debug("DB","Added prompt_counter column to sdk_sessions table")),this.db.query("PRAGMA table_info(observations)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE observations ADD COLUMN prompt_number INTEGER"),l.debug("DB","Added prompt_number column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN prompt_number INTEGER"),l.debug("DB","Added prompt_number column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(6,new Date().toISOString())}removeSessionSummariesUniqueConstraint(){if(!this.db.query("PRAGMA index_list(session_summaries)").all().some(s=>s.unique===1)){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString());return}l.debug("DB","Removing UNIQUE constraint from session_summaries.memory_session_id"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
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
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString()),l.debug("DB","Successfully removed UNIQUE constraint from session_summaries.memory_session_id")}addObservationHierarchicalFields(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(8))return;if(this.db.query("PRAGMA table_info(observations)").all().some(n=>n.name==="title")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString());return}l.debug("DB","Adding hierarchical fields to observations table"),this.db.run(`
      ALTER TABLE observations ADD COLUMN title TEXT;
      ALTER TABLE observations ADD COLUMN subtitle TEXT;
      ALTER TABLE observations ADD COLUMN facts TEXT;
      ALTER TABLE observations ADD COLUMN narrative TEXT;
      ALTER TABLE observations ADD COLUMN concepts TEXT;
      ALTER TABLE observations ADD COLUMN files_read TEXT;
      ALTER TABLE observations ADD COLUMN files_modified TEXT;
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString()),l.debug("DB","Successfully added hierarchical fields to observations table")}makeObservationsTextNullable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(9))return;let s=this.db.query("PRAGMA table_info(observations)").all().find(n=>n.name==="text");if(!s||s.notnull===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString());return}l.debug("DB","Making observations.text nullable"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
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
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString()),l.debug("DB","Successfully made observations.text nullable")}createUserPromptsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(10))return;if(this.db.query("PRAGMA table_info(user_prompts)").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString());return}l.debug("DB","Creating user_prompts table with FTS5 support"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
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
      `)}catch(s){l.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},s)}this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),l.debug("DB","Successfully created user_prompts table")}ensureDiscoveryTokensColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(11))return;this.db.query("PRAGMA table_info(observations)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE observations ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),l.debug("DB","Added discovery_tokens column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),l.debug("DB","Added discovery_tokens column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(11,new Date().toISOString())}createPendingMessagesTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(16))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString());return}l.debug("DB","Creating pending_messages table"),this.db.run(`
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
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),l.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;l.debug("DB","Checking session ID columns for semantic clarity rename");let t=0,s=(n,o,i)=>{let a=this.db.query(`PRAGMA table_info(${n})`).all(),d=a.some(u=>u.name===o);return a.some(u=>u.name===i)?!1:d?(this.db.run(`ALTER TABLE ${n} RENAME COLUMN ${o} TO ${i}`),l.debug("DB",`Renamed ${n}.${o} to ${i}`),!0):(l.warn("DB",`Column ${o} not found in ${n}, skipping rename`),!1)};s("sdk_sessions","claude_session_id","content_session_id")&&t++,s("sdk_sessions","sdk_session_id","memory_session_id")&&t++,s("pending_messages","claude_session_id","content_session_id")&&t++,s("observations","sdk_session_id","memory_session_id")&&t++,s("session_summaries","sdk_session_id","memory_session_id")&&t++,s("user_prompts","claude_session_id","content_session_id")&&t++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),t>0?l.debug("DB",`Successfully renamed ${t} session ID columns`):l.debug("DB","No session ID column renames needed (already up to date)")}repairSessionIdColumnRename(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(19)||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(19,new Date().toISOString())}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),l.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(!this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21)){l.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION");try{this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
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
        `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),l.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(t){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),t}}}addObservationContentHashColumn(){if(this.db.query("PRAGMA table_info(observations)").all().some(s=>s.name==="content_hash")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString());return}this.db.run("ALTER TABLE observations ADD COLUMN content_hash TEXT"),this.db.run("UPDATE observations SET content_hash = substr(hex(randomblob(8)), 1, 16) WHERE content_hash IS NULL"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch)"),l.debug("DB","Added content_hash column to observations table with backfill and index"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}addSessionCustomTitleColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23))return;this.db.query("PRAGMA table_info(sdk_sessions)").all().some(n=>n.name==="custom_title")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN custom_title TEXT"),l.debug("DB","Added custom_title column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString())}updateMemorySessionId(e,t){this.db.prepare(`
      UPDATE sdk_sessions
      SET memory_session_id = ?
      WHERE id = ?
    `).run(t,e)}ensureMemorySessionIdRegistered(e,t){let s=this.db.prepare(`
      SELECT id, memory_session_id FROM sdk_sessions WHERE id = ?
    `).get(e);if(!s)throw new Error(`Session ${e} not found in sdk_sessions`);s.memory_session_id!==t&&(this.db.prepare(`
        UPDATE sdk_sessions SET memory_session_id = ? WHERE id = ?
      `).run(t,e),l.info("DB","Registered memory_session_id before storage (FK fix)",{sessionDbId:e,oldId:s.memory_session_id,newId:t}))}getRecentSummaries(e,t=10){return this.db.prepare(`
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
    `).get(e)||null}getObservationsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o,type:i,concepts:a,files:d}=t,c=s==="date_asc"?"ASC":"DESC",u=n?`LIMIT ${n}`:"",_=e.map(()=>"?").join(","),T=[...e],g=[];if(o&&(g.push("project = ?"),T.push(o)),i)if(Array.isArray(i)){let p=i.map(()=>"?").join(",");g.push(`type IN (${p})`),T.push(...i)}else g.push("type = ?"),T.push(i);if(a){let p=Array.isArray(a)?a:[a],E=p.map(()=>"EXISTS (SELECT 1 FROM json_each(concepts) WHERE value = ?)");T.push(...p),g.push(`(${E.join(" OR ")})`)}if(d){let p=Array.isArray(d)?d:[d],E=p.map(()=>"(EXISTS (SELECT 1 FROM json_each(files_read) WHERE value LIKE ?) OR EXISTS (SELECT 1 FROM json_each(files_modified) WHERE value LIKE ?))");p.forEach(b=>{T.push(`%${b}%`,`%${b}%`)}),g.push(`(${E.join(" OR ")})`)}let f=g.length>0?`WHERE id IN (${_}) AND ${g.join(" AND ")}`:`WHERE id IN (${_})`;return this.db.prepare(`
      SELECT *
      FROM observations
      ${f}
      ORDER BY created_at_epoch ${c}
      ${u}
    `).all(...T)}getSummaryForSession(e){return this.db.prepare(`
      SELECT
        request, investigated, learned, completed, next_steps,
        files_read, files_edited, notes, prompt_number, created_at,
        created_at_epoch
      FROM session_summaries
      WHERE memory_session_id = ?
      ORDER BY created_at_epoch DESC
      LIMIT 1
    `).get(e)||null}getFilesForSession(e){let s=this.db.prepare(`
      SELECT files_read, files_modified
      FROM observations
      WHERE memory_session_id = ?
    `).all(e),n=new Set,o=new Set;for(let i of s){if(i.files_read){let a=JSON.parse(i.files_read);Array.isArray(a)&&a.forEach(d=>n.add(d))}if(i.files_modified){let a=JSON.parse(i.files_modified);Array.isArray(a)&&a.forEach(d=>o.add(d))}}return{filesRead:Array.from(n),filesModified:Array.from(o)}}getSessionById(e){return this.db.prepare(`
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
    `).run(e,t,s,n.toISOString(),o).lastInsertRowid}getUserPrompt(e,t){return this.db.prepare(`
      SELECT prompt_text
      FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
      LIMIT 1
    `).get(e,t)?.prompt_text??null}storeObservation(e,t,s,n,o=0,i){let a=i??Date.now(),d=new Date(a).toISOString(),c=N(e,s.title,s.narrative),u=F(this.db,c,a);if(u)return{id:u.id,createdAtEpoch:u.created_at_epoch};let T=this.db.prepare(`
      INSERT INTO observations
      (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
       files_read, files_modified, prompt_number, discovery_tokens, content_hash, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,t,s.type,s.title,s.subtitle,JSON.stringify(s.facts),s.narrative,JSON.stringify(s.concepts),JSON.stringify(s.files_read),JSON.stringify(s.files_modified),n||null,o,c,d,a);return{id:Number(T.lastInsertRowid),createdAtEpoch:a}}storeSummary(e,t,s,n,o=0,i){let a=i??Date.now(),d=new Date(a).toISOString(),u=this.db.prepare(`
      INSERT INTO session_summaries
      (memory_session_id, project, request, investigated, learned, completed,
       next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,t,s.request,s.investigated,s.learned,s.completed,s.next_steps,s.notes,n||null,o,d,a);return{id:Number(u.lastInsertRowid),createdAtEpoch:a}}storeObservations(e,t,s,n,o,i=0,a){let d=a??Date.now(),c=new Date(d).toISOString();return this.db.transaction(()=>{let _=[],T=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, content_hash, created_at, created_at_epoch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);for(let f of s){let y=N(e,f.title,f.narrative),p=F(this.db,y,d);if(p){_.push(p.id);continue}let E=T.run(e,t,f.type,f.title,f.subtitle,JSON.stringify(f.facts),f.narrative,JSON.stringify(f.concepts),JSON.stringify(f.files_read),JSON.stringify(f.files_modified),o||null,i,y,c,d);_.push(Number(E.lastInsertRowid))}let g=null;if(n){let y=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,t,n.request,n.investigated,n.learned,n.completed,n.next_steps,n.notes,o||null,i,c,d);g=Number(y.lastInsertRowid)}return{observationIds:_,summaryId:g,createdAtEpoch:d}})()}storeObservationsAndMarkComplete(e,t,s,n,o,i,a,d=0,c){let u=c??Date.now(),_=new Date(u).toISOString();return this.db.transaction(()=>{let g=[],f=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, content_hash, created_at, created_at_epoch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);for(let E of s){let b=N(e,E.title,E.narrative),S=F(this.db,b,u);if(S){g.push(S.id);continue}let ee=f.run(e,t,E.type,E.title,E.subtitle,JSON.stringify(E.facts),E.narrative,JSON.stringify(E.concepts),JSON.stringify(E.files_read),JSON.stringify(E.files_modified),a||null,d,b,_,u);g.push(Number(ee.lastInsertRowid))}let y;if(n){let b=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,t,n.request,n.investigated,n.learned,n.completed,n.next_steps,n.notes,a||null,d,_,u);y=Number(b.lastInsertRowid)}return this.db.prepare(`
        UPDATE pending_messages
        SET
          status = 'processed',
          completed_at_epoch = ?,
          tool_input = NULL,
          tool_response = NULL
        WHERE id = ? AND status = 'processing'
      `).run(u,o),{observationIds:g,summaryId:y,createdAtEpoch:u}})()}getSessionSummariesByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="date_asc"?"ASC":"DESC",a=n?`LIMIT ${n}`:"",d=e.map(()=>"?").join(","),c=[...e],u=o?`WHERE id IN (${d}) AND project = ?`:`WHERE id IN (${d})`;return o&&c.push(o),this.db.prepare(`
      SELECT * FROM session_summaries
      ${u}
      ORDER BY created_at_epoch ${i}
      ${a}
    `).all(...c)}getUserPromptsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="date_asc"?"ASC":"DESC",a=n?`LIMIT ${n}`:"",d=e.map(()=>"?").join(","),c=[...e],u=o?"AND s.project = ?":"";return o&&c.push(o),this.db.prepare(`
      SELECT
        up.*,
        s.project,
        s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.id IN (${d}) ${u}
      ORDER BY up.created_at_epoch ${i}
      ${a}
    `).all(...c)}getTimelineAroundTimestamp(e,t=10,s=10,n){return this.getTimelineAroundObservation(null,e,t,s,n)}getTimelineAroundObservation(e,t,s=10,n=10,o){let i=o?"AND project = ?":"",a=o?[o]:[],d,c;if(e!==null){let p=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id <= ? ${i}
        ORDER BY id DESC
        LIMIT ?
      `,E=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id >= ? ${i}
        ORDER BY id ASC
        LIMIT ?
      `;try{let b=this.db.prepare(p).all(e,...a,s+1),S=this.db.prepare(E).all(e,...a,n+1);if(b.length===0&&S.length===0)return{observations:[],sessions:[],prompts:[]};d=b.length>0?b[b.length-1].created_at_epoch:t,c=S.length>0?S[S.length-1].created_at_epoch:t}catch(b){return l.error("DB","Error getting boundary observations",void 0,{error:b,project:o}),{observations:[],sessions:[],prompts:[]}}}else{let p=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch <= ? ${i}
        ORDER BY created_at_epoch DESC
        LIMIT ?
      `,E=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch >= ? ${i}
        ORDER BY created_at_epoch ASC
        LIMIT ?
      `;try{let b=this.db.prepare(p).all(t,...a,s),S=this.db.prepare(E).all(t,...a,n+1);if(b.length===0&&S.length===0)return{observations:[],sessions:[],prompts:[]};d=b.length>0?b[b.length-1].created_at_epoch:t,c=S.length>0?S[S.length-1].created_at_epoch:t}catch(b){return l.error("DB","Error getting boundary timestamps",void 0,{error:b,project:o}),{observations:[],sessions:[],prompts:[]}}}let u=`
      SELECT *
      FROM observations
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,_=`
      SELECT *
      FROM session_summaries
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,T=`
      SELECT up.*, s.project, s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.created_at_epoch >= ? AND up.created_at_epoch <= ? ${i.replace("project","s.project")}
      ORDER BY up.created_at_epoch ASC
    `,g=this.db.prepare(u).all(d,c,...a),f=this.db.prepare(_).all(d,c,...a),y=this.db.prepare(T).all(d,c,...a);return{observations:g,sessions:f.map(p=>({id:p.id,memory_session_id:p.memory_session_id,project:p.project,request:p.request,completed:p.completed,next_steps:p.next_steps,created_at:p.created_at,created_at_epoch:p.created_at_epoch})),prompts:y.map(p=>({id:p.id,content_session_id:p.content_session_id,prompt_number:p.prompt_number,prompt_text:p.prompt_text,project:p.project,created_at:p.created_at,created_at_epoch:p.created_at_epoch}))}}getPromptById(e){return this.db.prepare(`
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
    `).run(t,s,e,o.toISOString(),o.getTime()),l.info("SESSION","Created manual session",{memorySessionId:t,project:e}),t}close(){this.db.close()}importSdkSession(e){let t=this.db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(e.content_session_id);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
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
    `).run(e.content_session_id,e.prompt_number,e.prompt_text,e.created_at,e.created_at_epoch).lastInsertRowid}}};var de=v(require("path"),1);function oe(r,e,t=.5){if(r<1)return 0;let s=Date.now(),n=Math.max(s-e,1e3)/1e3,o=r*Math.pow(n,-t);return Math.log(o)}function we(r){let{baseActivation:e,importance:t,accessCount:s}=r,n=Math.log(Math.max(s,1))/Math.LN2;return e*t*n}var C=class{nodes=new Map;edges=new Map;addNode(e){this.nodes.set(e.id,{id:e.id,cmu:e,activation:e.metadata.baseActivation})}addAssociation(e,t,s){let n=this.edges.get(e)||[];n.push({targetId:t,strength:s}),this.edges.set(e,n);let o=this.edges.get(t)||[];o.push({targetId:e,strength:s*.5}),this.edges.set(t,o)}getNode(e){return this.nodes.get(e)}getAssociations(e){return this.edges.get(e)||[]}retrieveContext(e,t=3){let s=new Map;for(let o of e)this.nodes.get(o)&&s.set(o,1);for(let o=0;o<t;o++){let i=new Map;for(let[a,d]of s){let c=this.edges.get(a)||[],u=c.length;if(u!==0)for(let _ of c){let T=d*_.strength/Math.sqrt(u),g=i.get(_.targetId)||0;i.set(_.targetId,g+T)}}for(let[a,d]of i){let c=s.get(a)||0;s.set(a,c+d)}}let n=[];for(let[o,i]of s){let a=this.nodes.get(o);a&&n.push({id:o,score:i+a.activation})}return n.sort((o,i)=>i.score-o.score),n.map(o=>o.id)}getAllNodes(){return Array.from(this.nodes.values())}size(){return this.nodes.size}};function es(r,e){if(r.length!==e.length||r.length===0)return 0;let t=0,s=0,n=0;for(let o=0;o<r.length;o++)t+=r[o]*e[o],s+=r[o]*r[o],n+=e[o]*e[o];return s===0||n===0?0:t/(Math.sqrt(s)*Math.sqrt(n))}function ke(r,e){let t=r.toLowerCase().split(/\s+/).filter(Boolean),s=new Map;for(let n of t)s.set(n,(s.get(n)||0)+1);return e.map(n=>s.get(n)||0)}function ts(r,e){let t=[r.content.title,r.content.narrative,...r.content.facts,...r.content.concepts].join(" "),s=[e.content.title,e.content.narrative,...e.content.facts,...e.content.concepts].join(" "),n=Array.from(new Set([...t.toLowerCase().split(/\s+/),...s.toLowerCase().split(/\s+/)].filter(Boolean))),o=ke(t,n),i=ke(s,n);return es(o,i)}function Ue(r,e=.95){let t=[],s=new Set;for(let n=0;n<r.length;n++)for(let o=n+1;o<r.length;o++){let i=r[n].id,a=r[o].id;if(s.has(i)||s.has(a))continue;let d=ts(r[n],r[o]);if(d>=e){let c=r[n].metadata.accessCount>r[o].metadata.accessCount?r[n]:r[o],u=r[n].metadata.accessCount>r[o].metadata.accessCount?r[o]:r[n];t.push({keep:c,remove:u,similarity:d}),s.add(u.id)}}return t}function ss(r,e,t=.5){let s=[];for(let n of r){let o=we(n.metadata);o<e&&s.push({cmu:n,retentionScore:o})}return s.sort((n,o)=>n.retentionScore-o.retentionScore)}function Pe(r,e,t,s=.5){if(r.length<=e)return r;let n=ss(r,t,s),o=new Set(n.map(i=>i.cmu.id));return r.filter(i=>!o.has(i.id)).slice(0,e)}function $e(r,e){let t=e*24*60*60*1e3,s=Date.now();return r.filter(n=>{let o=s-n.metadata.createdAt;return n.metadata.importance>=.7?!0:o<t})}var ie=class extends Error{constructor(t,s){super(t);this.cause=s;this.name="MemoryError"}};var B=class extends ie{constructor(e,t){super(`Pruning failed: ${e}`,t),this.name="PruningError"}};async function Fe(r,e={}){let{dedupeThreshold:t=.95,importanceThreshold:s=.1,maxAgeDays:n=30,maxPerTier:o={}}=e,i=new C;for(let u of r)i.addNode(u);let a=0,d=0,c=0;try{let u=Ue(r,t),_=new Set,T=Object.fromEntries(r.map(p=>[p.id,new Set(p.associations)]));for(let p of u){_.add(p.remove.id),T[p.keep.id]?.add(p.remove.id);for(let E of p.remove.associations)T[p.keep.id]?.add(E);a++}c=rs(r,i,T);let g=r.filter(p=>!_.has(p.id)),f=new Map;for(let p of g){let E=f.get(p.tier)||0;f.set(p.tier,E+1)}for(let[p,E]of Object.entries(o)){let b=f.get(p)||0;if(b>E){let S=g.filter(te=>te.tier===p),ee=b-E,Bt=Pe(S,E,s).slice(-ee);for(let te of Bt)_.add(te.id),d++}}let y=$e(g,n);for(let p of g)y.find(E=>E.id===p.id)||_.add(p.id);return d=_.size-a,{merged:a,pruned:d,linked:c,removedIds:Array.from(_),associationsById:Object.fromEntries(Object.entries(T).filter(([p])=>!_.has(p)).map(([p,E])=>[p,Array.from(E).filter(b=>b!==p&&!_.has(b))]))}}catch(u){throw new B(`Consolidation failed: ${u instanceof Error?u.message:"Unknown error"}`,u)}}function rs(r,e,t){let s=0;for(let n=0;n<r.length;n++)for(let o of r[n].content.concepts){for(let i=n+1;i<r.length;i++)r[i].content.concepts.includes(o)&&(r[n].associations.includes(r[i].id)||(e.addAssociation(r[n].id,r[i].id,.5),t[r[n].id]?.add(r[i].id),t[r[i].id]?.add(r[n].id),s++));for(let i of r[n].content.filesRead)for(let a=0;a<r.length;a++)n!==a&&(r[a].content.filesRead.includes(i)||r[a].content.filesModified.includes(i))&&(r[n].associations.includes(r[a].id)||(e.addAssociation(r[n].id,r[a].id,.7),t[r[n].id]?.add(r[a].id),t[r[a].id]?.add(r[n].id),s++))}return s}var X=class{constructor(e){this.db=e}async getSyncToken(){let e=this.db.query(`
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
    `).run(JSON.stringify(t),e)}async updateLastAccessed(e,t){this.db.query(`
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
    `).all(...o,t),s.map(this.rowToCMU)}rowToCMU(e){let t=JSON.parse(e.tags||"[]"),s=JSON.parse(e.associations||"[]"),n=JSON.parse(e.facts||"[]"),o=JSON.parse(e.concepts||"[]"),i=JSON.parse(e.files_read||"[]"),a=JSON.parse(e.files_modified||"[]");return{id:String(e.id),sessionId:e.memory_session_id,project:e.project,tier:e.tier||"episodic",memoryType:e.type,content:{title:e.title||"",narrative:e.narrative||e.text||"",facts:n,concepts:o,filesRead:i,filesModified:a},metadata:{createdAt:e.created_at_epoch,lastAccessed:e.last_accessed||e.created_at_epoch,accessCount:e.access_count||0,importance:e.importance||.5,baseActivation:e.base_activation||0,decayRate:e.decay_rate||.5},tags:t,associations:s}}};var je={enabled:!0,observations:50,sessions:10,tiers:{sensory:{decay:.9,maxCount:100},working:{decay:.5,maxCount:50},episodic:{decay:.3,maxCount:1e3},semantic:{decay:.1,maxCount:1e4},procedural:{decay:.2,maxCount:500}},actr:{decayParameter:.5,activationThreshold:.1},pruning:{dedupeSimilarity:.95,importanceThreshold:.2,consolidateOnIdleMinutes:15,maxAgeDays:30},vectorDb:{provider:"none",collectionName:"ai-mem"}};function ns(r,e){if(e.includes(r))return!0;let t=r.replace(/\\/g,"/"),s=de.default.posix.basename(t);return e.some(n=>{let o=n.replace(/\\/g,"/");return o===t||de.default.posix.basename(o)===s})}var ce=class{storage;settings;graph=null;lastSyncToken=null;constructor(e,t){this.storage=new X(e),this.settings={...je,...t}}async initialize(){await this.refreshGraph()}async refreshGraph(){this.graph=new C;let e=await this.storage.getAllMemories();for(let t of e)this.graph.addNode(t);this.lastSyncToken=await this.storage.getSyncToken()}async ensureFreshGraph(){let e=await this.storage.getSyncToken();(!this.graph||this.lastSyncToken!==e)&&await this.refreshGraph()}async captureMemory(e,t,s,n,o=.5){let i=Date.now(),a=this.determineTier(s),d={id:"",sessionId:e,project:t,tier:a,memoryType:n,content:s,metadata:{createdAt:i,lastAccessed:i,accessCount:1,importance:o,baseActivation:oe(1,i,this.settings.actr.decayParameter),decayRate:this.settings.tiers[a]?.decay??.5},tags:[],associations:[]},c=await this.storage.storeMemory(d),u={...d,id:c};return this.graph&&this.graph.addNode(u),this.lastSyncToken=null,u}async retrieveMemories(e,t,s=50){await this.ensureFreshGraph();let n=e.toLowerCase().split(/\s+/).filter(Boolean),i=await this.storage.searchByKeywords(n,s*2);if(t?.tiers?.length){let d=t.tiers;i=i.filter(c=>d.includes(c.tier))}if(t?.projects?.length){let d=t.projects;i=i.filter(c=>ns(c.project,d))}if(t?.minImportance!==void 0){let d=t.minImportance;i=i.filter(c=>c.metadata.importance>=d)}if(t?.since){let d=t.since;i=i.filter(c=>c.metadata.createdAt>=d)}let a=i.slice(0,s).map(d=>({cmu:d,score:d.metadata.baseActivation,activation:d.metadata.baseActivation,source:"fts5"}));if(this.graph&&t?.projects?.length===1){let d=this.graph.retrieveContext(a.slice(0,5).map(c=>c.cmu.id),3);for(let c of d)if(!a.find(u=>u.cmu.id===c)){let u=await this.storage.getMemoryById(c);u&&a.push({cmu:u,score:u.metadata.baseActivation*.5,activation:u.metadata.baseActivation,source:"spreading"})}}return a.sort((d,c)=>c.score-d.score).slice(0,s)}async recordAccess(e){let t=Date.now();await this.storage.updateLastAccessed(e,t),await this.storage.incrementAccessCount(e);let s=await this.storage.getMemoryById(e);if(s){let n=oe(s.metadata.accessCount+1,t,this.settings.actr.decayParameter);await this.storage.updateActivation(e,n)}this.lastSyncToken=null}async getMemoryById(e){return this.storage.getMemoryById(e)}async consolidate(){await this.ensureFreshGraph();let e=await this.storage.getAllMemories(),t=await Fe(e,{dedupeThreshold:this.settings.pruning.dedupeSimilarity,importanceThreshold:this.settings.pruning.importanceThreshold,maxAgeDays:this.settings.pruning.maxAgeDays,maxPerTier:Object.fromEntries(Object.entries(this.settings.tiers).map(([s,n])=>[s,n.maxCount]))});for(let[s,n]of Object.entries(t.associationsById))await this.storage.updateAssociations(s,n);for(let s of t.removedIds)await this.storage.deleteMemory(s);return await this.refreshGraph(),{merged:t.merged,pruned:t.pruned,linked:t.linked}}async getStats(){await this.ensureFreshGraph();let e=await this.storage.getAllMemories(),t={sensory:0,working:0,episodic:0,semantic:0,procedural:0},s=0;for(let n of e)t[n.tier]=(t[n.tier]||0)+1,s+=n.metadata.baseActivation;return{total:e.length,byTier:t,avgActivation:e.length>0?s/e.length:0}}determineTier(e){let t=e.title.toLowerCase(),s=e.narrative.toLowerCase();return t.startsWith("tool:")||t.startsWith("procedure:")||s.includes("step ")||s.includes("workflow")||s.includes("procedure")?"procedural":e.filesModified.length>0?"episodic":e.filesRead.length>5?"episodic":e.facts.length>0||e.concepts.length>=3?"semantic":e.narrative.length<160?"working":"episodic"}getSettings(){return this.settings}};function Be(r,e){return new ce(r,e)}var ue=v(require("path"),1);var H=require("fs"),G=v(require("path"),1),D={isWorktree:!1,worktreeName:null,parentRepoPath:null,parentProjectName:null};function Xe(r){let e=G.default.join(r,".git"),t;try{t=(0,H.statSync)(e)}catch{return D}if(!t.isFile())return D;let s;try{s=(0,H.readFileSync)(e,"utf-8").trim()}catch{return D}let n=s.match(/^gitdir:\s*(.+)$/);if(!n)return D;let i=n[1].match(/^(.+)[/\\]\.git[/\\]worktrees[/\\]([^/\\]+)$/);if(!i)return D;let a=i[1],d=G.default.basename(r),c=G.default.basename(a);return{isWorktree:!0,worktreeName:d,parentRepoPath:a,parentProjectName:c}}function pe(r){return r.replace(/\\/g,"/").replace(/\/+/g,"/").replace(/\/$/,"")}function Ge(r){return pe(r).split("/").filter(Boolean)}function me(r){if(!r||r.trim()==="")return l.warn("PROJECT_NAME","Empty cwd provided, using fallback",{cwd:r}),"unknown-project";let e=ue.default.basename(r);if(e===""){if(process.platform==="win32"){let s=r.match(/^([A-Z]):\\/i);if(s){let o=`drive-${s[1].toUpperCase()}`;return l.info("PROJECT_NAME","Drive root detected",{cwd:r,projectName:o}),o}}return l.warn("PROJECT_NAME","Root directory detected, using fallback",{cwd:r}),"unknown-project"}return e}function os(r){if(!r||r.trim()==="")return me(r);let e=pe(ue.default.resolve(r)),t=Ge(e);return t.length===0?me(r):t.length===1?t[0]:`${t[t.length-2]}/${t[t.length-1]}`}function W(r){if(!r||r.trim()==="")return["unknown-project"];let e=pe(r.trim()),t=Ge(e),s=new Set([e]);return t.length>0&&s.add(t[t.length-1]),t.length>1&&s.add(`${t[t.length-2]}/${t[t.length-1]}`),Array.from(s)}function He(r){let e=me(r),t=os(r);if(!r)return{primary:e,canonical:t,parent:null,isWorktree:!1,allProjects:W(t)};let s=Xe(r);if(s.isWorktree&&s.parentProjectName){let n=new Set([...W(t),...W(s.parentProjectName),e]);return{primary:t,canonical:t,parent:s.parentProjectName,isWorktree:!0,allProjects:Array.from(n)}}return{primary:t,canonical:t,parent:null,isWorktree:!1,allProjects:W(t)}}var qe=v(require("path"),1),Ye=require("os");var I=require("fs"),Y=require("path"),We=require("os"),q=class{static DEFAULTS={AI_MEM_MODEL:"claude-sonnet-4-5",AI_MEM_CONTEXT_OBSERVATIONS:"50",AI_MEM_WORKER_PORT:"37777",AI_MEM_WORKER_HOST:"127.0.0.1",AI_MEM_SKIP_TOOLS:"ListMcpResourcesTool,SlashCommand,Skill,TodoWrite,AskUserQuestion",AI_MEM_PROVIDER:"claude",AI_MEM_CLAUDE_AUTH_METHOD:"cli",AI_MEM_GEMINI_API_KEY:"",AI_MEM_GEMINI_MODEL:"gemini-2.5-flash-lite",AI_MEM_GEMINI_RATE_LIMITING_ENABLED:"true",AI_MEM_OPENROUTER_API_KEY:"",AI_MEM_OPENROUTER_MODEL:"xiaomi/mimo-v2-flash:free",AI_MEM_OPENROUTER_SITE_URL:"",AI_MEM_OPENROUTER_APP_NAME:"claude-mem",AI_MEM_OPENROUTER_MAX_CONTEXT_MESSAGES:"20",AI_MEM_OPENROUTER_MAX_TOKENS:"100000",AI_MEM_DATA_DIR:(0,Y.join)((0,We.homedir)(),".ai-mem"),AI_MEM_LOG_LEVEL:"INFO",AI_MEM_PYTHON_VERSION:"3.13",CLAUDE_CODE_PATH:"",AI_MEM_MODE:"code",AI_MEM_CONTEXT_SHOW_READ_TOKENS:"false",AI_MEM_CONTEXT_SHOW_WORK_TOKENS:"false",AI_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT:"false",AI_MEM_CONTEXT_SHOW_SAVINGS_PERCENT:"true",AI_MEM_CONTEXT_FULL_COUNT:"0",AI_MEM_CONTEXT_FULL_FIELD:"narrative",AI_MEM_CONTEXT_SESSION_COUNT:"10",AI_MEM_CONTEXT_SHOW_LAST_SUMMARY:"true",AI_MEM_CONTEXT_SHOW_LAST_MESSAGE:"false",AI_MEM_CONTEXT_SHOW_TERMINAL_OUTPUT:"true",AI_MEM_FOLDER_CLAUDEMD_ENABLED:"false",AI_MEM_MAX_CONCURRENT_AGENTS:"2",AI_MEM_EXCLUDED_PROJECTS:"",AI_MEM_FOLDER_MD_EXCLUDE:"[]",AI_MEM_CHROMA_ENABLED:"true",AI_MEM_CHROMA_MODE:"local",AI_MEM_CHROMA_HOST:"127.0.0.1",AI_MEM_CHROMA_PORT:"8000",AI_MEM_CHROMA_SSL:"false",AI_MEM_CHROMA_API_KEY:"",AI_MEM_CHROMA_TENANT:"default_tenant",AI_MEM_CHROMA_DATABASE:"default_database"};static getAllDefaults(){return{...this.DEFAULTS}}static get(e){return process.env[e]??this.DEFAULTS[e]}static getInt(e){let t=this.get(e);return parseInt(t,10)}static getBool(e){let t=this.get(e);return t==="true"||t===!0}static applyEnvOverrides(e){let t={...e};for(let s of Object.keys(this.DEFAULTS))process.env[s]!==void 0&&(t[s]=process.env[s]);return t}static loadFromFile(e){try{if(!(0,I.existsSync)(e)){let i=this.getAllDefaults();try{let a=(0,Y.dirname)(e);(0,I.existsSync)(a)||(0,I.mkdirSync)(a,{recursive:!0}),(0,I.writeFileSync)(e,JSON.stringify(i,null,2),"utf-8"),console.log("[SETTINGS] Created settings file with defaults:",e)}catch(a){console.warn("[SETTINGS] Failed to create settings file, using in-memory defaults:",e,a)}return this.applyEnvOverrides(i)}let t=(0,I.readFileSync)(e,"utf-8"),s=JSON.parse(t),n=s;if(s.env&&typeof s.env=="object"){n=s.env;try{(0,I.writeFileSync)(e,JSON.stringify(n,null,2),"utf-8"),console.log("[SETTINGS] Migrated settings file from nested to flat schema:",e)}catch(i){console.warn("[SETTINGS] Failed to auto-migrate settings file:",e,i)}}let o={...this.DEFAULTS};for(let i of Object.keys(this.DEFAULTS))n[i]!==void 0&&(o[i]=n[i]);return this.applyEnvOverrides(o)}catch(t){return console.warn("[SETTINGS] Failed to load settings, using defaults:",e,t),this.applyEnvOverrides(this.getAllDefaults())}}};var x=require("fs"),V=require("path");var O=class r{static instance=null;activeMode=null;modesDir;constructor(){let e=Le(),t=[(0,V.join)(e,"modes"),(0,V.join)(e,"..","plugin","modes")],s=t.find(n=>(0,x.existsSync)(n));this.modesDir=s||t[0]}static getInstance(){return r.instance||(r.instance=new r),r.instance}parseInheritance(e){let t=e.split("--");if(t.length===1)return{hasParent:!1,parentId:"",overrideId:""};if(t.length>2)throw new Error(`Invalid mode inheritance: ${e}. Only one level of inheritance supported (parent--override)`);return{hasParent:!0,parentId:t[0],overrideId:e}}isPlainObject(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}deepMerge(e,t){let s={...e};for(let n in t){let o=t[n],i=e[n];this.isPlainObject(o)&&this.isPlainObject(i)?s[n]=this.deepMerge(i,o):s[n]=o}return s}loadModeFile(e){let t=(0,V.join)(this.modesDir,`${e}.json`);if(!(0,x.existsSync)(t))throw new Error(`Mode file not found: ${t}`);let s=(0,x.readFileSync)(t,"utf-8");return JSON.parse(s)}loadMode(e){let t=this.parseInheritance(e);if(!t.hasParent)try{let d=this.loadModeFile(e);return this.activeMode=d,l.debug("SYSTEM",`Loaded mode: ${d.name} (${e})`,void 0,{types:d.observation_types.map(c=>c.id),concepts:d.observation_concepts.map(c=>c.id)}),d}catch{if(l.warn("SYSTEM",`Mode file not found: ${e}, falling back to 'code'`),e==="code")throw new Error("Critical: code.json mode file missing");return this.loadMode("code")}let{parentId:s,overrideId:n}=t,o;try{o=this.loadMode(s)}catch{l.warn("SYSTEM",`Parent mode '${s}' not found for ${e}, falling back to 'code'`),o=this.loadMode("code")}let i;try{i=this.loadModeFile(n),l.debug("SYSTEM",`Loaded override file: ${n} for parent ${s}`)}catch{return l.warn("SYSTEM",`Override file '${n}' not found, using parent mode '${s}' only`),this.activeMode=o,o}if(!i)return l.warn("SYSTEM",`Invalid override file: ${n}, using parent mode '${s}' only`),this.activeMode=o,o;let a=this.deepMerge(o,i);return this.activeMode=a,l.debug("SYSTEM",`Loaded mode with inheritance: ${a.name} (${e} = ${s} + ${n})`,void 0,{parent:s,override:n,types:a.observation_types.map(d=>d.id),concepts:a.observation_concepts.map(d=>d.id)}),a}getActiveMode(){if(!this.activeMode)throw new Error("No mode loaded. Call loadMode() first.");return this.activeMode}getObservationTypes(){return this.getActiveMode().observation_types}getObservationConcepts(){return this.getActiveMode().observation_concepts}getTypeIcon(e){return this.getObservationTypes().find(s=>s.id===e)?.emoji||"\u{1F4DD}"}getWorkEmoji(e){return this.getObservationTypes().find(s=>s.id===e)?.work_emoji||"\u{1F4DD}"}validateType(e){return this.getObservationTypes().some(t=>t.id===e)}getTypeLabel(e){return this.getObservationTypes().find(s=>s.id===e)?.label||e}};function le(){let r=qe.default.join((0,Ye.homedir)(),".ai-mem","settings.json"),e=q.loadFromFile(r),t=O.getInstance().getActiveMode(),s=new Set(t.observation_types.map(o=>o.id)),n=new Set(t.observation_concepts.map(o=>o.id));return{totalObservationCount:parseInt(e.AI_MEM_CONTEXT_OBSERVATIONS,10),fullObservationCount:parseInt(e.AI_MEM_CONTEXT_FULL_COUNT,10),sessionCount:parseInt(e.AI_MEM_CONTEXT_SESSION_COUNT,10),showReadTokens:e.AI_MEM_CONTEXT_SHOW_READ_TOKENS==="true",showWorkTokens:e.AI_MEM_CONTEXT_SHOW_WORK_TOKENS==="true",showSavingsAmount:e.AI_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT==="true",showSavingsPercent:e.AI_MEM_CONTEXT_SHOW_SAVINGS_PERCENT==="true",observationTypes:s,observationConcepts:n,fullObservationField:e.AI_MEM_CONTEXT_FULL_FIELD,showLastSummary:e.AI_MEM_CONTEXT_SHOW_LAST_SUMMARY==="true",showLastMessage:e.AI_MEM_CONTEXT_SHOW_LAST_MESSAGE==="true"}}var m={reset:"\x1B[0m",bright:"\x1B[1m",dim:"\x1B[2m",cyan:"\x1B[36m",green:"\x1B[32m",yellow:"\x1B[33m",blue:"\x1B[34m",magenta:"\x1B[35m",gray:"\x1B[90m",red:"\x1B[31m"},Ve=4,_e=1;function Ee(r){let e=(r.title?.length||0)+(r.subtitle?.length||0)+(r.narrative?.length||0)+JSON.stringify(r.facts||[]).length;return Math.ceil(e/Ve)}function ge(r){let e=r.length,t=r.reduce((i,a)=>i+Ee(a),0),s=r.reduce((i,a)=>i+(a.discovery_tokens||0),0),n=s-t,o=s>0?Math.round(n/s*100):0;return{totalObservations:e,totalReadTokens:t,totalDiscoveryTokens:s,savings:n,savingsPercent:o}}function is(r){return O.getInstance().getWorkEmoji(r)}function w(r,e){let t=Ee(r),s=r.discovery_tokens||0,n=is(r.type),o=s>0?`${n} ${s.toLocaleString()}`:"-";return{readTokens:t,discoveryTokens:s,discoveryDisplay:o,workEmoji:n}}function K(r){return r.showReadTokens||r.showWorkTokens||r.showSavingsAmount||r.showSavingsPercent}var Ke=v(require("path"),1),J=require("fs");function Te(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(",");return r.db.prepare(`
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
  `).all(e,...s,...o,t.totalObservationCount)}function fe(r,e,t){return r.db.prepare(`
    SELECT id, memory_session_id, request, investigated, learned, completed, next_steps, created_at, created_at_epoch
    FROM session_summaries
    WHERE project = ?
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(e,t.sessionCount+_e)}function Je(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(","),a=e.map(()=>"?").join(",");return r.db.prepare(`
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
  `).all(...e,...s,...o,t.totalObservationCount)}function ze(r,e,t){let s=e.map(()=>"?").join(",");return r.db.prepare(`
    SELECT id, memory_session_id, request, investigated, learned, completed, next_steps, created_at, created_at_epoch, project
    FROM session_summaries
    WHERE project IN (${s})
    ORDER BY created_at_epoch DESC
    LIMIT ?
  `).all(...e,t.sessionCount+_e)}function as(r){return r.replace(/\//g,"-")}function ds(r){try{if(!(0,J.existsSync)(r))return{userMessage:"",assistantMessage:""};let e=(0,J.readFileSync)(r,"utf-8").trim();if(!e)return{userMessage:"",assistantMessage:""};let t=e.split(`
`).filter(n=>n.trim()),s="";for(let n=t.length-1;n>=0;n--)try{let o=t[n];if(!o.includes('"type":"assistant"'))continue;let i=JSON.parse(o);if(i.type==="assistant"&&i.message?.content&&Array.isArray(i.message.content)){let a="";for(let d of i.message.content)d.type==="text"&&(a+=d.text);if(a=a.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g,"").trim(),a){s=a;break}}}catch(o){l.debug("PARSER","Skipping malformed transcript line",{lineIndex:n},o);continue}return{userMessage:"",assistantMessage:s}}catch(e){return l.failure("WORKER","Failed to extract prior messages from transcript",{transcriptPath:r},e),{userMessage:"",assistantMessage:""}}}function be(r,e,t,s){if(!e.showLastMessage||r.length===0)return{userMessage:"",assistantMessage:""};let n=r.find(d=>d.memory_session_id!==t);if(!n)return{userMessage:"",assistantMessage:""};let o=n.memory_session_id,i=as(s),a=Ke.default.join(M,"projects",i,`${o}.jsonl`);return ds(a)}function Qe(r,e){let t=e[0]?.id;return r.map((s,n)=>{let o=n===0?null:e[n+1];return{...s,displayEpoch:o?o.created_at_epoch:s.created_at_epoch,displayTime:o?o.created_at:s.created_at,shouldShowLink:s.id!==t}})}function he(r,e){let t=[...r.map(s=>({type:"observation",data:s})),...e.map(s=>({type:"summary",data:s}))];return t.sort((s,n)=>{let o=s.type==="observation"?s.data.created_at_epoch:s.data.displayEpoch,i=n.type==="observation"?n.data.created_at_epoch:n.data.displayEpoch;return o-i}),t}function Ze(r,e){return new Set(r.slice(0,e).map(t=>t.id))}function et(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function tt(r){return[`# $CMEM ${r} ${et()}`,""]}function st(){return[`Legend: \u{1F3AF}session ${O.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji}${t.id}`).join(" ")}`,"Format: ID TIME TYPE TITLE","Fetch details: get_observations([IDs]) | Search: mem-search skill",""]}function rt(){return[]}function nt(){return[]}function ot(r,e){let t=[],s=[`${r.totalObservations} obs (${r.totalReadTokens.toLocaleString()}t read)`,`${r.totalDiscoveryTokens.toLocaleString()}t work`];return r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)&&(e.showSavingsPercent?s.push(`${r.savingsPercent}% savings`):e.showSavingsAmount&&s.push(`${r.savings.toLocaleString()}t saved`)),t.push(`Stats: ${s.join(" | ")}`),t.push(""),t}function it(r){return[`### ${r}`]}function at(r){return r.toLowerCase().replace(" am","a").replace(" pm","p")}function dt(r,e,t){let s=r.title||"Untitled",n=O.getInstance().getTypeIcon(r.type),o=e?at(e):'"';return`${r.id} ${o} ${n} ${s}`}function ct(r,e,t,s){let n=[],o=r.title||"Untitled",i=O.getInstance().getTypeIcon(r.type),a=e?at(e):'"',{readTokens:d,discoveryDisplay:c}=w(r,s);n.push(`**${r.id}** ${a} ${i} **${o}**`),t&&n.push(t);let u=[];return s.showReadTokens&&u.push(`~${d}t`),s.showWorkTokens&&u.push(c),u.length>0&&n.push(u.join(" ")),n.push(""),n}function mt(r,e){return[`S${r.id} ${r.request||"Session started"} (${e})`]}function k(r,e){return e?[`**${r}**: ${e}`,""]:[]}function ut(r){return r.assistantMessage?["","---","","**Previously**","",`A: ${r.assistantMessage}`,""]:[]}function pt(r,e){return["",`Access ${Math.round(r/1e3)}k tokens of past work via get_observations([IDs]) or mem-search skill.`]}function lt(r){return`# $CMEM ${r} ${et()}

No previous sessions found.`}function _t(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function Et(r){return["",`${m.bright}${m.cyan}[${r}] recent context, ${_t()}${m.reset}`,`${m.gray}${"\u2500".repeat(60)}${m.reset}`,""]}function gt(){let e=O.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji} ${t.id}`).join(" | ");return[`${m.dim}Legend: session-request | ${e}${m.reset}`,""]}function Tt(){return[`${m.bright}Column Key${m.reset}`,`${m.dim}  Read: Tokens to read this observation (cost to learn it now)${m.reset}`,`${m.dim}  Work: Tokens spent on work that produced this record ( research, building, deciding)${m.reset}`,""]}function ft(){return[`${m.dim}Context Index: This semantic index (titles, types, files, tokens) is usually sufficient to understand past work.${m.reset}`,"",`${m.dim}When you need implementation details, rationale, or debugging context:${m.reset}`,`${m.dim}  - Fetch by ID: get_observations([IDs]) for observations visible in this index${m.reset}`,`${m.dim}  - Search history: Use the mem-search skill for past decisions, bugs, and deeper research${m.reset}`,`${m.dim}  - Trust this index over re-reading code for past decisions and learnings${m.reset}`,""]}function bt(r,e){let t=[];if(t.push(`${m.bright}${m.cyan}Context Economics${m.reset}`),t.push(`${m.dim}  Loading: ${r.totalObservations} observations (${r.totalReadTokens.toLocaleString()} tokens to read)${m.reset}`),t.push(`${m.dim}  Work investment: ${r.totalDiscoveryTokens.toLocaleString()} tokens spent on research, building, and decisions${m.reset}`),r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)){let s="  Your savings: ";e.showSavingsAmount&&e.showSavingsPercent?s+=`${r.savings.toLocaleString()} tokens (${r.savingsPercent}% reduction from reuse)`:e.showSavingsAmount?s+=`${r.savings.toLocaleString()} tokens`:s+=`${r.savingsPercent}% reduction from reuse`,t.push(`${m.green}${s}${m.reset}`)}return t.push(""),t}function ht(r){return[`${m.bright}${m.cyan}${r}${m.reset}`,""]}function St(r){return[`${m.dim}${r}${m.reset}`]}function yt(r,e,t,s){let n=r.title||"Untitled",o=O.getInstance().getTypeIcon(r.type),{readTokens:i,discoveryTokens:a,workEmoji:d}=w(r,s),c=t?`${m.dim}${e}${m.reset}`:" ".repeat(e.length),u=s.showReadTokens&&i>0?`${m.dim}(~${i}t)${m.reset}`:"",_=s.showWorkTokens&&a>0?`${m.dim}(${d} ${a.toLocaleString()}t)${m.reset}`:"";return`  ${m.dim}#${r.id}${m.reset}  ${c}  ${o}  ${n} ${u} ${_}`}function Ot(r,e,t,s,n){let o=[],i=r.title||"Untitled",a=O.getInstance().getTypeIcon(r.type),{readTokens:d,discoveryTokens:c,workEmoji:u}=w(r,n),_=t?`${m.dim}${e}${m.reset}`:" ".repeat(e.length),T=n.showReadTokens&&d>0?`${m.dim}(~${d}t)${m.reset}`:"",g=n.showWorkTokens&&c>0?`${m.dim}(${u} ${c.toLocaleString()}t)${m.reset}`:"";return o.push(`  ${m.dim}#${r.id}${m.reset}  ${_}  ${a}  ${m.bright}${i}${m.reset}`),s&&o.push(`    ${m.dim}${s}${m.reset}`),(T||g)&&o.push(`    ${T} ${g}`),o.push(""),o}function Rt(r,e){let t=`${r.request||"Session started"} (${e})`;return[`${m.yellow}#S${r.id}${m.reset} ${t}`,""]}function U(r,e,t){return e?[`${t}${r}:${m.reset} ${e}`,""]:[]}function It(r){return r.assistantMessage?["","---","",`${m.bright}${m.magenta}Previously${m.reset}`,"",`${m.dim}A: ${r.assistantMessage}${m.reset}`,""]:[]}function At(r,e){let t=Math.round(r/1e3);return["",`${m.dim}Access ${t}k tokens of past research & decisions for just ${e.toLocaleString()}t. Use the claude-mem skill to access memories by ID.${m.reset}`]}function vt(r){return`
${m.bright}${m.cyan}[${r}] recent context, ${_t()}${m.reset}
${m.gray}${"\u2500".repeat(60)}${m.reset}

${m.dim}No previous sessions found for this project yet.${m.reset}
`}function Mt(r,e,t,s){let n=[];return s?n.push(...Et(r)):n.push(...tt(r)),s?n.push(...gt()):n.push(...st()),s?n.push(...Tt()):n.push(...rt()),s?n.push(...ft()):n.push(...nt()),K(t)&&(s?n.push(...bt(e,t)):n.push(...ot(e,t))),n}var Se=v(require("path"),1);function Z(r){if(!r)return[];try{let e=JSON.parse(r);return Array.isArray(e)?e:[]}catch(e){return l.debug("PARSER","Failed to parse JSON array, using empty fallback",{preview:r?.substring(0,50)},e),[]}}function ye(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:!0})}function Oe(r){return new Date(r).toLocaleString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0})}function Ct(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric"})}function Nt(r,e){return Se.default.isAbsolute(r)?Se.default.relative(e,r):r}function Lt(r,e,t){let s=Z(r);if(s.length>0)return Nt(s[0],e);if(t){let n=Z(t);if(n.length>0)return Nt(n[0],e)}return"General"}function cs(r){let e=new Map;for(let s of r){let n=s.type==="observation"?s.data.created_at:s.data.displayTime,o=Ct(n);e.has(o)||e.set(o,[]),e.get(o).push(s)}let t=Array.from(e.entries()).sort((s,n)=>{let o=new Date(s[0]).getTime(),i=new Date(n[0]).getTime();return o-i});return new Map(t)}function Dt(r,e){return e.fullObservationField==="narrative"?r.narrative:r.facts?Z(r.facts).join(`
`):null}function ms(r,e,t,s){let n=[];n.push(...it(r));let o="";for(let i of e)if(i.type==="summary"){o="";let a=i.data,d=ye(a.displayTime);n.push(...mt(a,d))}else{let a=i.data,d=Oe(a.created_at),u=d!==o?d:"";if(o=d,t.has(a.id)){let T=Dt(a,s);n.push(...ct(a,u,T,s))}else n.push(dt(a,u,s))}return n}function us(r,e,t,s,n){let o=[];o.push(...ht(r));let i=null,a="";for(let d of e)if(d.type==="summary"){i=null,a="";let c=d.data,u=ye(c.displayTime);o.push(...Rt(c,u))}else{let c=d.data,u=Lt(c.files_modified,n,c.files_read),_=Oe(c.created_at),T=_!==a;a=_;let g=t.has(c.id);if(u!==i&&(o.push(...St(u)),i=u),g){let f=Dt(c,s);o.push(...Ot(c,_,T,f,s))}else o.push(yt(c,_,T,s))}return o.push(""),o}function ps(r,e,t,s,n,o){return o?us(r,e,t,s,n):ms(r,e,t,s)}function xt(r,e,t,s,n){let o=[],i=cs(r);for(let[a,d]of i)o.push(...ps(a,d,e,t,s,n));return o}function wt(r,e,t){return!(!r.showLastSummary||!e||!!!(e.investigated||e.learned||e.completed||e.next_steps)||t&&e.created_at_epoch<=t.created_at_epoch)}function kt(r,e){let t=[];return e?(t.push(...U("Investigated",r.investigated,m.blue)),t.push(...U("Learned",r.learned,m.yellow)),t.push(...U("Completed",r.completed,m.green)),t.push(...U("Next Steps",r.next_steps,m.magenta))):(t.push(...k("Investigated",r.investigated)),t.push(...k("Learned",r.learned)),t.push(...k("Completed",r.completed)),t.push(...k("Next Steps",r.next_steps))),t}function Ut(r,e){return e?It(r):ut(r)}function Pt(r,e,t){return!K(e)||r.totalDiscoveryTokens<=0||r.savings<=0?[]:t?At(r.totalDiscoveryTokens,r.totalReadTokens):pt(r.totalDiscoveryTokens,r.totalReadTokens)}var ls=$t.default.join((0,Ft.homedir)(),".claude","plugins","marketplaces","thedotmack","plugin",".install-version");function _s(){try{return new j}catch(r){if(r.code==="ERR_DLOPEN_FAILED"){try{(0,jt.unlinkSync)(ls)}catch(e){l.debug("SYSTEM","Marker file cleanup failed (may not exist)",{},e)}return l.error("SYSTEM","Native module rebuild needed - restart Claude Code to auto-fix"),null}throw r}}function Es(r,e){return e?vt(r):lt(r)}function gs(r,e,t,s,n,o,i,a){let d=[],c=ge(e);d.push(...Mt(r,c,n,a));let u=t.slice(0,n.sessionCount),_=Qe(u,t),T=he(e,_),g=Ze(e,n.fullObservationCount);d.push(...xt(T,g,n,o,a));let f=t[0],y=e[0];if(wt(n,f,y)&&d.push(...kt(f,a)),s.length>0){d.push(a?"Long-Term Brain Memory":"## Long-Term Brain Memory"),d.push("");for(let E of s.slice(0,6))d.push(`- [${E.tier}] ${E.title}: ${E.narrative.slice(0,180)}`);d.push("")}let p=be(e,n,i,o);return d.push(...Ut(p,a)),d.push(...Pt(c,n,a)),d.join(`
`).trimEnd()}async function Re(r,e=!1){let t=le(),s=r?.cwd??process.cwd(),n=He(s),o=n.canonical,i=r?.projects||n.allProjects;r?.full&&(t.totalObservationCount=999999,t.sessionCount=999999);let a=_s();if(!a)return"";try{let d=Be(a.db);await d.initialize();let c=i.length>1?Je(a,i,t):Te(a,o,t),u=i.length>1?ze(a,i,t):fe(a,o,t),_=await d.retrieveMemories("",{projects:i,tiers:["semantic","procedural","episodic"]},8).then(g=>g.map(f=>({tier:f.cmu.tier,title:f.cmu.content.title,narrative:f.cmu.content.narrative})));return c.length===0&&u.length===0&&_.length===0?Es(o,e):gs(o,c,u,_,t,s,r?.session_id,e)}finally{a.close()}}0&&(module.exports={generateContext});
