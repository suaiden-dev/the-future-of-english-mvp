import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, Phone, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
}

export function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchContacts();
  }, [currentPage]);

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, count, error } = await supabase
        .from("contacts")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setContacts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Error loading contacts");
    } finally {
      setLoadingContacts(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="w-full">
      <div className="rounded-xl border bg-card text-card-foreground shadow bg-white">
        <div className="flex flex-row items-center justify-between p-6 border-b">
          <h3 className="flex items-center gap-2 font-semibold text-lg">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            Contact List ({totalCount})
          </h3>
          <Button onClick={fetchContacts} variant="outline" size="sm" disabled={loadingContacts}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingContacts ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="p-0">
          {loadingContacts ? (
            <p className="text-center py-12 text-muted-foreground animate-pulse">Loading contacts...</p>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 space-y-2">
               <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
               </div>
               <h3 className="text-lg font-medium">No contacts</h3>
               <p className="text-muted-foreground">You haven't received any messages yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-muted/50">
                    <tr className="border-b transition-colors data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px]">Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground max-w-xs">Message</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted odd:bg-white even:bg-gray-50/30">
                        <td className="p-4 align-top whitespace-nowrap font-medium text-muted-foreground/80">
                          {format(new Date(contact.created_at), "MM/dd/yyyy HH:mm", { locale: enUS })}
                        </td>
                        <td className="p-4 align-top font-semibold text-gray-900">{contact.name}</td>
                        <td className="p-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                              <a href={`mailto:${contact.email}`} className="hover:text-primary hover:underline transition-colors">
                                {contact.email}
                              </a>
                            </div>
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-top max-w-xs md:max-w-md lg:max-w-lg">
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100/50">
                            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm" title={contact.message}>
                                {contact.message}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, totalCount)}</strong> of <strong>{totalCount}</strong> results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || loadingContacts}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous Page</span>
                  </Button>
                  <div className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || loadingContacts}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next Page</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
