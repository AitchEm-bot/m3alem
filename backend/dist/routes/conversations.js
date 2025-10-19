"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../services/supabase");
const router = express_1.default.Router();
/**
 * GET /api/conversations
 * Get all conversations, ordered by most recent
 */
router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabaseService
            .getClient()
            .from("conversations")
            .select("*")
            .order("updated_at", { ascending: false });
        if (error) {
            throw new Error(error.message);
        }
        const conversations = (data || []).map((row) => ({
            id: row.id,
            title: row.title,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            user_id: row.user_id,
        }));
        res.json({ conversations });
    }
    catch (error) {
        console.error("[Conversations] Error fetching conversations:", error);
        res.status(500).json({
            error: "Failed to fetch conversations",
            message: error.message,
        });
    }
});
/**
 * GET /api/conversations/:id
 * Get a specific conversation with all its messages
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch conversation
        const { data: convData, error: convError } = await supabase_1.supabaseService
            .getClient()
            .from("conversations")
            .select("*")
            .eq("id", id)
            .single();
        if (convError) {
            if (convError.code === "PGRST116") {
                return res.status(404).json({ error: "Conversation not found" });
            }
            throw new Error(convError.message);
        }
        // Fetch messages
        const { data: msgData, error: msgError } = await supabase_1.supabaseService
            .getClient()
            .from("messages")
            .select("*")
            .eq("conversation_id", id)
            .order("created_at", { ascending: true });
        if (msgError) {
            throw new Error(msgError.message);
        }
        const messages = (msgData || []).map((row) => ({
            id: row.id,
            conversation_id: row.conversation_id,
            role: row.role,
            content: row.content,
            sources: row.sources,
            image_data: row.image_data,
            image_filename: row.image_filename,
            is_spoken: row.is_spoken || false,
            created_at: new Date(row.created_at),
        }));
        const conversation = {
            id: convData.id,
            title: convData.title,
            created_at: new Date(convData.created_at),
            updated_at: new Date(convData.updated_at),
            user_id: convData.user_id,
            messages,
        };
        res.json(conversation);
    }
    catch (error) {
        console.error("[Conversations] Error fetching conversation:", error);
        res.status(500).json({
            error: "Failed to fetch conversation",
            message: error.message,
        });
    }
});
/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post("/", async (req, res) => {
    try {
        const { title, user_id } = req.body;
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }
        const { data, error } = await supabase_1.supabaseService
            .getClient()
            .from("conversations")
            .insert({
            title,
            user_id: user_id || null,
        })
            .select()
            .single();
        if (error) {
            throw new Error(error.message);
        }
        const conversation = {
            id: data.id,
            title: data.title,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at),
            user_id: data.user_id,
        };
        res.status(201).json(conversation);
    }
    catch (error) {
        console.error("[Conversations] Error creating conversation:", error);
        res.status(500).json({
            error: "Failed to create conversation",
            message: error.message,
        });
    }
});
/**
 * PUT /api/conversations/:id
 * Update a conversation title
 */
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }
        const { data, error } = await supabase_1.supabaseService
            .getClient()
            .from("conversations")
            .update({ title })
            .eq("id", id)
            .select()
            .single();
        if (error) {
            if (error.code === "PGRST116") {
                return res.status(404).json({ error: "Conversation not found" });
            }
            throw new Error(error.message);
        }
        const conversation = {
            id: data.id,
            title: data.title,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at),
            user_id: data.user_id,
        };
        res.json(conversation);
    }
    catch (error) {
        console.error("[Conversations] Error updating conversation:", error);
        res.status(500).json({
            error: "Failed to update conversation",
            message: error.message,
        });
    }
});
/**
 * DELETE /api/conversations/:id
 * Delete a conversation (cascades to messages)
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabaseService
            .getClient()
            .from("conversations")
            .delete()
            .eq("id", id);
        if (error) {
            throw new Error(error.message);
        }
        res.json({ success: true, message: "Conversation deleted" });
    }
    catch (error) {
        console.error("[Conversations] Error deleting conversation:", error);
        res.status(500).json({
            error: "Failed to delete conversation",
            message: error.message,
        });
    }
});
/**
 * POST /api/conversations/:id/messages
 * Add a message to a conversation
 */
router.post("/:id/messages", async (req, res) => {
    try {
        const { id } = req.params;
        const { role, content, sources } = req.body;
        if (!role || !content) {
            return res.status(400).json({ error: "Role and content are required" });
        }
        if (role !== "user" && role !== "assistant") {
            return res.status(400).json({ error: "Role must be 'user' or 'assistant'" });
        }
        // Verify conversation exists
        const { data: convData, error: convError } = await supabase_1.supabaseService
            .getClient()
            .from("conversations")
            .select("id")
            .eq("id", id)
            .single();
        if (convError) {
            if (convError.code === "PGRST116") {
                return res.status(404).json({ error: "Conversation not found" });
            }
            throw new Error(convError.message);
        }
        // Insert message
        const { data, error } = await supabase_1.supabaseService
            .getClient()
            .from("messages")
            .insert({
            conversation_id: id,
            role,
            content,
            sources: sources || null,
        })
            .select()
            .single();
        if (error) {
            throw new Error(error.message);
        }
        // Update conversation's updated_at timestamp
        await supabase_1.supabaseService
            .getClient()
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", id);
        const message = {
            id: data.id,
            conversation_id: data.conversation_id,
            role: data.role,
            content: data.content,
            sources: data.sources,
            created_at: new Date(data.created_at),
        };
        res.status(201).json(message);
    }
    catch (error) {
        console.error("[Conversations] Error adding message:", error);
        res.status(500).json({
            error: "Failed to add message",
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=conversations.js.map