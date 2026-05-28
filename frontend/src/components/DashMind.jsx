import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Sparkles, Mic, MicOff, Volume2, VolumeX, Send, X, 
  Download, Printer, RefreshCw, BarChart2, LineChart as LineIcon, 
  Table as TableIcon, Layers, FileText, CheckCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

const DashMind = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      type: 'text',
      text: "Hello! I am DashMind, your professional workforce analytics assistant. Ask me anything about attendance logs, late check-ins, leaves, shift performance, or your own weekly analytics metrics!",
      speech: "Hello! I am DashMind. How can I assist you with your workforce analytics today?"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initialize Web Speech API for voice recognition (Speech-to-text)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setQuery(text);
        handleSendQuery(text);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Text-to-Speech synthesizer helper
  const speakText = (text) => {
    if (!isVoiceEnabled || !synthRef.current) return;
    synthRef.current.cancel(); // Stop any currently speaking audio

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    
    // Select a premium English female voice if available
    const femaleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('zira') || 
       v.name.toLowerCase().includes('samantha') || 
       v.name.toLowerCase().includes('google'))
    ) || voices[0];

    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser version. Please try Google Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (synthRef.current) synthRef.current.cancel();
      recognitionRef.current.start();
    }
  };

  // Main query submission trigger
  const handleSendQuery = async (queryText = null) => {
    const textToSend = queryText || query;
    if (!textToSend.trim()) return;

    // Add user message to state
    setMessages(prev => [...prev, { sender: 'user', type: 'text', text: textToSend }]);
    setQuery('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/dashmind/query', { query: textToSend }, { withCredentials: true });
      
      const newAiMsg = {
        sender: 'ai',
        type: data.type,
        text: data.data?.text || data.speech,
        speech: data.speech,
        columns: data.columns,
        chartDetails: data.chartDetails,
        data: data.data,
        authorized: data.authorized !== false
      };

      setMessages(prev => [...prev, newAiMsg]);

      // Speak response if voice is active
      if (data.speech) {
        speakText(data.speech);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        type: 'text', 
        text: "I encountered a network or database problem while processing your analytics request. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // CSV Report Exporter
  const handleExportCSV = (tableData, columns) => {
    if (!tableData || tableData.length === 0) return;
    
    const headers = columns.join(',');
    const rows = tableData.map(row => 
      columns.map(col => `"${String(row[col] || '').replace(/"/g, '""')}"`).join(',')
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DashMind_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable report generator
  const handlePrintReport = (title = "DashMind Analytics Report") => {
    window.print();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] select-none font-sans">
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 ring-4 ring-emerald-500/20 group"
        >
          {/* Futuristic hologram pulse animation */}
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-30 animate-ping group-hover:animate-none"></span>
          <Sparkles className="w-7 h-7 text-white" />
        </button>
      )}

      {/* Expanded AI Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[480px] h-[600px] rounded-3xl bg-white/95 border border-slate-200/50 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-300">
          
          {/* Header Bar */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between border-b border-slate-700/30">
            <div className="flex items-center gap-3">
              {/* Animated AI Avatar Face */}
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center overflow-hidden border border-emerald-400/30 shadow-inner">
                {isSpeaking ? (
                  /* Speaks wave bar animation */
                  <div className="flex items-center gap-0.5 justify-center">
                    <span className="w-1 h-3 bg-white rounded-full animate-bounce"></span>
                    <span className="w-1 h-5 bg-white rounded-full animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:0.3s]"></span>
                  </div>
                ) : isListening ? (
                  /* Pulsing record indicator */
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse"></span>
                ) : (
                  /* Static futuristic Jarvis mind orb */
                  <div className="w-5 h-5 rounded-full bg-white opacity-85 animate-pulse relative flex items-center justify-center">
                    <span className="absolute w-7 h-7 rounded-full border border-white/40 animate-spin"></span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-sm leading-none flex items-center gap-1.5">
                  DashMind AI <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </p>
                <span className="text-[10px] text-emerald-400/80 font-medium tracking-widest uppercase">Workforce Intelligence</span>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center gap-2">
              {/* Voice Mute/Unmute Toggle */}
              <button 
                onClick={() => {
                  setIsVoiceEnabled(!isVoiceEnabled);
                  if (synthRef.current) synthRef.current.cancel();
                }}
                title={isVoiceEnabled ? "Mute Voice replies" : "Enable Voice replies"}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${isVoiceEnabled ? 'text-emerald-400' : 'text-slate-400'}`}
              >
                {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Clear Memory Trigger */}
              <button 
                onClick={() => setMessages([
                  {
                    sender: 'ai',
                    type: 'text',
                    text: "Conversation history cleared. I am ready to answer any new analytics query!",
                    speech: "Conversation history cleared."
                  }
                ])}
                title="Reset Session memory"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200"
              >
                <RefreshCw size={16} />
              </button>

              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsOpen(false);
                  if (synthRef.current) synthRef.current.cancel();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Interactive Chat Scroll Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
              >
                {/* Bubble Container */}
                <div 
                  className={`max-w-[90%] p-4 rounded-3xl shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-br-none' 
                      : msg.authorized === false 
                        ? 'bg-red-50 border border-red-200/50 text-red-700 rounded-bl-none'
                        : 'bg-white border border-slate-200/50 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {/* TEXT RESPONSE */}
                  {msg.type === 'text' && (
                    <div className="text-xs leading-relaxed whitespace-pre-line font-medium">
                      {msg.text}
                    </div>
                  )}

                  {/* VISUAL KPI CARDS */}
                  {msg.type === 'kpi' && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-600 border-b pb-1.5">{msg.speech}</p>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {msg.data.map((card, i) => (
                          <div key={i} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.title}</p>
                              <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                              {card.description && <p className="text-[9px] text-slate-400 font-medium mt-0.5">{card.description}</p>}
                            </div>
                            <CheckCircle className="text-emerald-500" size={24} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VISUAL CHART RESPONSE */}
                  {(msg.type === 'bar' || msg.type === 'line') && (
                    <div className="space-y-3 w-full">
                      <p className="text-xs font-semibold text-slate-600 border-b pb-1.5">{msg.speech}</p>
                      <div className="w-[300px] sm:w-[410px] h-48 pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          {msg.type === 'bar' ? (
                            <BarChart data={msg.data}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey={msg.chartDetails.xKey} tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              {msg.chartDetails.bars.map((bar, bi) => (
                                <Bar key={bi} dataKey={bar.key} fill={bar.color} radius={[4, 4, 0, 0]} />
                              ))}
                            </BarChart>
                          ) : (
                            <LineChart data={msg.data}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey={msg.chartDetails.xKey} tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              {msg.chartDetails.lines.map((line, li) => (
                                <Line key={li} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={2} activeDot={{ r: 4 }} />
                              ))}
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* VISUAL TABLE RESPONSE */}
                  {msg.type === 'table' && (
                    <div className="space-y-3 w-full overflow-hidden">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <p className="text-xs font-semibold text-slate-700">{msg.speech}</p>
                        <div className="flex gap-1.5 shrink-0">
                          {/* Export CSV Trigger */}
                          <button 
                            onClick={() => handleExportCSV(msg.data, msg.columns)}
                            title="Export data as CSV report"
                            className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 transition-all duration-200"
                          >
                            <Download size={12} />
                          </button>
                          
                          {/* Print Report Trigger */}
                          <button 
                            onClick={() => handlePrintReport()}
                            title="Print Analytics report"
                            className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 transition-all duration-200"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Actual Structured Data Table */}
                      <div className="overflow-x-auto border border-slate-100 rounded-2xl max-h-48 custom-scrollbar">
                        <table className="w-full text-left text-[10px] font-medium text-slate-700">
                          <thead className="bg-slate-50 text-slate-500 sticky top-0 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              {msg.columns.map((col, ci) => (
                                <th key={ci} className="px-3 py-2 font-bold">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.data.map((row, ri) => (
                              <tr key={ri} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                {msg.columns.map((col, ci) => (
                                  <td key={ci} className="px-3 py-2 text-slate-800 whitespace-nowrap">{row[col]}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live Typing / Thinking Indicator */}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="px-4 py-3 bg-white border border-slate-200/50 rounded-3xl rounded-bl-none shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* User Input controls & Speech Button */}
          <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
            {/* Native browser-speech micro button */}
            <button 
              onClick={toggleListening}
              className={`p-3 rounded-full flex items-center justify-center shrink-0 shadow-sm border transition-all duration-300 ${
                isListening 
                  ? 'bg-red-50 border-red-200 text-red-500 animate-pulse scale-105' 
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input 
              type="text" 
              placeholder={isListening ? "Listening..." : "Ask DashMind anything..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendQuery();
              }}
              className="flex-1 input-field py-2.5 text-xs"
              disabled={isListening}
            />

            <button 
              onClick={() => handleSendQuery()}
              className="p-3 bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
              disabled={isListening}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashMind;
