import React, { useState, useCallback } from "react";
import { Upload, Send, Search, Users, MessageSquare, CheckCircle, X, Plus } from "lucide-react";
import * as XLSX from "xlsx";

const T = {
  ink: "#12212F",
  inkSoft: "#3C5169",
  paper: "#F5F6F2",
  paperRaised: "#FFFFFF",
  line: "#E1E3DD",
  green: "#3F7A52",
  greenBg: "#E3EEE3",
  blue: "#33587A",
  blueBg: "#E4EBF1",
  amber: "#C7891A",
  amberBg: "#FBF0DC",
};

const FONT_DISPLAY = "'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";

export default function WhatsappDispatcher({ onBack, clients, onSaveClient }) {
  const [contacts, setContacts] = useState([]);
  const [message, setMessage] = useState("Olá {nome}, tudo bem? Gostaria de falar sobre seu contrato.");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [sourceTab, setSourceTab] = useState("excel"); // "excel" ou "clientes"

  // Carregar contatos dos clientes cadastrados
  const loadClientsContacts = useCallback(() => {
    const processed = (clients || []).map((c, idx) => ({
      id: `client-${c.id}`,
      name: c.nomeContato || c.operadora || `Cliente ${idx + 1}`,
      phone: c.telefone ? String(c.telefone).replace(/\D/g, "") : "",
      originalPhone: c.telefone || "",
      clientId: c.id,
    })).filter(c => c.phone.length >= 10);
    
    setContacts(processed);
    setSourceTab("clientes");
  }, [clients]);

  // Processar upload do Excel
  const handleFileUpload = useCallback((file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // Mapear colunas possíveis para nome e telefone
        const processed = jsonData.map((row, idx) => {
          const phone = row["telefone"] || row["Telefone"] || row["TELEFONE"] || 
                       row["celular"] || row["Celular"] || row["CELULAR"] ||
                       row["whatsapp"] || row["Whatsapp"] || row["WHATSAPP"] ||
                       row["numero"] || row["Numero"] || row["NUMERO"] ||
                       row["número"] || row["Número"] || row["NÚMERO"] ||
                       row["tel"] || row["Tel"] || row["TEL"] || "";
          
          const name = row["nome"] || row["Nome"] || row["NOME"] || 
                      row["nome_contato"] || row["Nome Contato"] || 
                      row["cliente"] || row["Cliente"] || 
                      row["contato"] || row["Contato"] || `Contato ${idx + 1}`;
          
          // Limpar telefone (só números)
          const cleanPhone = String(phone).replace(/\D/g, "");
          
          return {
            id: idx,
            name: String(name).trim(),
            phone: cleanPhone,
            originalPhone: String(phone).trim(),
          };
        }).filter(c => c.phone.length >= 10); // Só contatos com telefone válido
        
        setContacts(processed);
        setSourceTab("excel");
      } catch (err) {
        alert("Erro ao ler arquivo Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Drag and drop
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Gerar link do WhatsApp
  const generateWhatsAppLink = useCallback((contact) => {
    const personalizedMessage = message.replace(/{nome}/gi, contact.name);
    const encodedMessage = encodeURIComponent(personalizedMessage);
    return `https://wa.me/55${contact.phone}?text=${encodedMessage}`;
  }, [message]);

  // Filtrar contatos
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  // Adicionar novo contato manualmente
  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) return;
    
    const cleanPhone = String(newContact.phone).replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      alert("Digite um telefone válido com pelo menos 10 números");
      return;
    }
    
    const contact = {
      id: `manual-${Date.now()}`,
      name: newContact.name.trim(),
      phone: cleanPhone,
      originalPhone: newContact.phone.trim(),
    };
    
    setContacts(prev => [...prev, contact]);
    setNewContact({ name: "", phone: "" });
    setShowNewContact(false);
  };

  // Estatísticas
  const stats = {
    total: contacts.length,
    filtered: filteredContacts.length,
    withPhone: contacts.filter(c => c.phone.length >= 10).length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: FONT_BODY }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 
            className="text-2xl font-bold mb-1" 
            style={{ fontFamily: FONT_DISPLAY, color: T.ink }}
          >
            Disparador WhatsApp
          </h1>
          <p className="text-sm" style={{ color: T.inkSoft }}>
            Importe contatos do Excel e envie mensagens personalizadas
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md text-sm font-medium border flex items-center gap-2 hover:bg-black/5"
          style={{ borderColor: T.line, color: T.inkSoft }}
        >
          <X size={16} />
          Voltar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: T.paperRaised, borderColor: T.line }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: T.blueBg }}>
              <Users size={20} color={T.blue} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: T.inkSoft }}>Total Importado</p>
              <p className="text-2xl font-mono" style={{ color: T.ink }}>{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: T.paperRaised, borderColor: T.line }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: T.greenBg }}>
              <CheckCircle size={20} color={T.green} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: T.inkSoft }}>Com Telefone Válido</p>
              <p className="text-2xl font-mono" style={{ color: T.ink }}>{stats.withPhone}</p>
            </div>
          </div>
        </div>
        
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: T.paperRaised, borderColor: T.line }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: T.amberBg }}>
              <Search size={20} color={T.amber} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase" style={{ color: T.inkSoft }}>Filtrados</p>
              <p className="text-2xl font-mono" style={{ color: T.ink }}>{stats.filtered}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna da Esquerda - Upload e Mensagem */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tabs para origem dos contatos */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSourceTab("excel")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                sourceTab === "excel" ? "bg-blue-50 border-blue-200" : "hover:bg-black/5"
              }`}
              style={{ 
                borderColor: sourceTab === "excel" ? T.blue : T.line,
                color: sourceTab === "excel" ? T.blue : T.inkSoft,
                backgroundColor: sourceTab === "excel" ? T.blueBg : T.paperRaised
              }}
            >
              <Upload size={14} className="inline mr-1.5" />
              Excel
            </button>
            <button
              onClick={loadClientsContacts}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                sourceTab === "clientes" ? "bg-green-50 border-green-200" : "hover:bg-black/5"
              }`}
              style={{ 
                borderColor: sourceTab === "clientes" ? T.green : T.line,
                color: sourceTab === "clientes" ? T.green : T.inkSoft,
                backgroundColor: sourceTab === "clientes" ? T.greenBg : T.paperRaised
              }}
            >
              <Users size={14} className="inline mr-1.5" />
              Clientes ({clients?.length || 0})
            </button>
          </div>

          {/* Upload Area */}
          <div
            className={`rounded-xl p-6 border-2 border-dashed transition-all cursor-pointer ${
              isDragging ? "border-blue-500 bg-blue-50" : ""
            }`}
            style={{ 
              borderColor: isDragging ? undefined : T.line,
              backgroundColor: isDragging ? undefined : T.paperRaised
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer block text-center">
              <Upload 
                size={40} 
                className="mx-auto mb-3" 
                style={{ color: T.blue }} 
              />
              <p className="font-semibold mb-1" style={{ color: T.ink }}>
                Arraste seu Excel aqui
              </p>
              <p className="text-sm" style={{ color: T.inkSoft }}>
                ou clique para selecionar
              </p>
              <p className="text-xs mt-2" style={{ color: T.inkSoft }}>
                Colunas esperadas: Nome, Telefone/Celular/WhatsApp
              </p>
            </label>
          </div>

          {/* Adicionar Contato Manualmente */}
          <div
            className="rounded-xl p-4 border"
            style={{ backgroundColor: T.paperRaised, borderColor: T.line }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} style={{ color: T.green }} />
                <h3 className="font-semibold" style={{ color: T.ink }}>Adicionar Contato</h3>
              </div>
              <button
                onClick={() => setShowNewContact(!showNewContact)}
                className="text-xs px-3 py-1.5 rounded-md font-medium"
                style={{ 
                  backgroundColor: showNewContact ? T.green : T.grayBg,
                  color: showNewContact ? "#fff" : T.ink 
                }}
              >
                {showNewContact ? "Cancelar" : "Novo"}
              </button>
            </div>
            
            {showNewContact && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: T.inkSoft }}>Nome</label>
                  <input
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border text-sm outline-none focus:ring-2 focus:ring-green-500"
                    style={{ borderColor: T.line, backgroundColor: T.paper, color: T.ink }}
                    placeholder="Digite o nome"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: T.inkSoft }}>Telefone/WhatsApp</label>
                  <input
                    type="text"
                    value={newContact.phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border text-sm outline-none focus:ring-2 focus:ring-green-500"
                    style={{ borderColor: T.line, backgroundColor: T.paper, color: T.ink }}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <button
                  onClick={handleAddContact}
                  className="w-full px-4 py-2 rounded-md text-sm font-medium text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: T.green }}
                >
                  <Plus size={14} />
                  Adicionar à Lista
                </button>
              </div>
            )}
          </div>

          {/* Message Editor */}
          <div
            className="rounded-xl p-4 border"
            style={{ backgroundColor: T.paperRaised, borderColor: T.line }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={18} style={{ color: T.blue }} />
              <h3 className="font-semibold" style={{ color: T.ink }}>Mensagem</h3>
            </div>
            <p className="text-xs mb-2" style={{ color: T.inkSoft }}>
              Use <code style={{ backgroundColor: T.amberBg, padding: "2px 6px", borderRadius: 4 }}>{`{nome}`}</code> para personalizar com o nome da pessoa
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 rounded-md border text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              style={{ 
                borderColor: T.line, 
                backgroundColor: T.paper,
                color: T.ink,
                minHeight: "120px"
              }}
              placeholder="Digite sua mensagem aqui..."
            />
            
            {/* Preview */}
            {contacts.length > 0 && (
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: T.grayBg }}>
                <p className="text-xs font-semibold mb-2" style={{ color: T.inkSoft }}>PRÉ-VISUALIZAÇÃO:</p>
                <p className="text-sm italic" style={{ color: T.inkSoft }}>
                  "{message.replace(/{nome}/gi, contacts[0].name)}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita - Lista de Contatos */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl border h-[600px] flex flex-col"
            style={{ backgroundColor: T.paperRaised, borderColor: T.line }}
          >
            {/* Search Bar */}
            <div className="p-4 border-b" style={{ borderColor: T.line }}>
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2" 
                  size={18} 
                  style={{ color: T.inkSoft }} 
                />
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: T.line, backgroundColor: T.paper, color: T.ink }}
                />
              </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <Users size={48} className="mb-4" style={{ color: T.inkSoft, opacity: 0.3 }} />
                  <p className="text-center" style={{ color: T.inkSoft }}>
                    {contacts.length === 0 
                      ? "Importe um arquivo Excel para começar"
                      : "Nenhum contato encontrado"}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0" style={{ backgroundColor: T.paperRaised }}>
                    <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: T.inkSoft }}>
                        Nome
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: T.inkSoft }}>
                        Telefone
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold uppercase" style={{ color: T.inkSoft }}>
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.slice(0, 100).map((contact) => {
                      const link = generateWhatsAppLink(contact);
                      return (
                        <tr 
                          key={contact.id}
                          className="hover:bg-black/[0.02]"
                          style={{ borderBottom: `1px solid ${T.line}` }}
                        >
                          <td className="py-3 px-4 text-sm" style={{ color: T.ink }}>
                            {contact.name}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono" style={{ color: T.inkSoft }}>
                            {contact.originalPhone}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: T.green }}
                            >
                              <Send size={12} />
                              Enviar
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            {filteredContacts.length > 100 && (
              <div className="p-3 border-t text-center text-xs" style={{ borderColor: T.line, color: T.inkSoft }}>
                Mostrando 100 de {filteredContacts.length} contatos. Use o filtro para encontrar específicos.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
