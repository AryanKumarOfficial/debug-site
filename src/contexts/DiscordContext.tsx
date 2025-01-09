"use client";

import React, {createContext, useContext, useState, useCallback, useMemo, useEffect} from "react";
import {toast} from "@/hooks/use-toast";
import {ToastAction} from "@/components/ui/toast";
import axios from "axios";

interface Disco {
    id: string | null;
    username: string | null;
    email: string | null;
    isRequestSent: boolean;
    isAccepted: boolean;
    isDeclined: boolean;
    isMember: boolean;
}

interface DiscordContextType {
    discordStat: Disco;
    discordStats: Disco[];
    roles: any[];
    loading: boolean;
    sendJoinRequest: (email: string) => Promise<void>;
    updateDiscordStats: (data: Disco) => void;
    getDiscordStats: () => Promise<void>;
    addRole: (name: string, color: string) => Promise<void>;
    addRoleToUser: (userId: string, roleId: string) => Promise<void>;
    addMember: (userId: string, access_token: string) => Promise<void>;
    getRoles: () => Promise<void>;
}

const DiscordContext = createContext<DiscordContextType | undefined>(undefined);

export const useDiscord = (): DiscordContextType => {
    const context = useContext(DiscordContext);
    if (!context) {
        throw new Error("useDiscord must be used within a DiscordProvider");
    }
    return context;
};

export const DiscordProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<any[]>([]);
    const [discordStat, setDiscordStat] = useState<Disco>(() => {
        const storedData = typeof window !== "undefined" ? localStorage.getItem("discord") : null;
        return storedData ? JSON.parse(storedData) : {
            id: null,
            username: null,
            email: null,
            isRequestSent: false,
            isAccepted: false,
            isDeclined: false,
            isMember: false,
        };
    });

    const [discordStats, setDiscordStats] = useState<Disco[]>(() => {
        const storedData = typeof window !== "undefined" ? localStorage.getItem("discords") : null;
        return storedData ? JSON.parse(storedData) : [];
    });

    const saveToLocalStorage = useCallback((key: string, value: any) => {
        localStorage.setItem(key, JSON.stringify(value));
    }, []);

    const updateStateFromLocalStorage = useCallback(() => {
        if (typeof window !== "undefined") {
            const storedDiscord = localStorage.getItem("discord");
            const storedDiscords = localStorage.getItem("discords");
            if (storedDiscord) setDiscordStat(JSON.parse(storedDiscord));
            if (storedDiscords) setDiscordStats(JSON.parse(storedDiscords));
        }
    }, []);

    // Sync state with local storage whenever there's a change in local storage values
    useEffect(() => {
        updateStateFromLocalStorage();

        const handleStorageChange = () => {
            updateStateFromLocalStorage();
        };

        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [updateStateFromLocalStorage]);

    const showToast = useCallback((title: string, description: string, variant: "default" | "destructive") => {
        toast({
            title,
            description,
            variant,
            className: variant === "default" ? "bg-gray-900 text-white border border-green-500" : "bg-red-500 text-white",
            action: (
                <ToastAction
                    className="hover:text-gray-900 border border-green-500"
                    altText="close"
                >
                    Close
                </ToastAction>
            ),
        });
    }, []);

    const sendJoinRequest = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            console.log("joining discord server");
            console.log("userId", userId);
            const res = await axios.get(`${process.env.NEXTAUTH_URL}/api/discord/users/${userId}`);

            const data = await res.data;

            console.log("data", data);
            if (data) {
                const newStat = {
                    id: data.id,
                    username: data.username,
                    email: data.email,
                    isRequestSent: data.isRequestSent,
                    isAccepted: data.isAccepted,
                    isDeclined: data.isDeclined,
                    isMember: data.isMember,
                };

                setDiscordStat(newStat);
                setDiscordStats((prev) => [...prev, newStat]);
                saveToLocalStorage("discord", newStat);
                saveToLocalStorage("discords", [...discordStats, newStat]);
                console.log("newStat", newStat);
                showToast("Success", "Discord server request sent successfully", "default");
            }
        } catch (error) {
            console.error(error);
            showToast("Error", "An error occurred while sending the request to join the Discord server.", "destructive");
        } finally {
            setLoading(false);
        }
    }, [discordStats, saveToLocalStorage, showToast]);

    const updateDiscordStats = useCallback((data: Disco) => {
        setDiscordStat(data);
        setDiscordStats((prev) => {
            const updatedStats = prev.map((stat) => (stat.email === data.email ? data : stat));
            saveToLocalStorage("discords", updatedStats);
            return updatedStats;
        });
        saveToLocalStorage("discord", data);
    }, [saveToLocalStorage]);

    const getDiscordStats = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get("/api/auth/send");
            setDiscordStats(res.data);
            saveToLocalStorage("discords", res.data);
            showToast("Success", "Discord server stats fetched successfully", "default");
        } catch (error) {
            console.error(error);
            showToast("Error", "An error occurred while fetching the Discord server stats.", "destructive");
        } finally {
            setLoading(false);
        }
    }, [saveToLocalStorage, showToast]);

    const addRole = useCallback(async (name: string, color: string) => {
        try {
            const {data} = await axios.post("/api/discord/users/role", {name, color});
            setRoles((prev) => [...prev, data]);
            showToast("Success", "Discord role added successfully", "default");
        } catch (error) {
            console.error(error);
            showToast("Error", "An error occurred while adding a role.", "destructive");
        }
    }, [showToast]);

    const getRoles = useCallback(async () => {
        try {
            const {data} = await axios.get("/api/discord/roles");
            setRoles(data.roles);
            showToast("Success", "Discord roles fetched successfully", "default");
        } catch (error) {
            console.error(error);
            showToast("Error", "An error occurred while fetching roles.", "destructive");
        }
    }, [showToast]);

    const addMember = useCallback(async (userId: string, access_token: string) => {
        try {
            await axios.post("/api/discord/users", {userId, access_token});
            showToast("Success", "Discord member added successfully", "default");
        } catch (error) {
            console.error(error);
            showToast("Error", "An error occurred while adding a member.", "destructive");
        }
    }, [showToast]);

    const addRoleToUser = useCallback(async (userId: string, roleId: string) => {
        try {
            await axios.post("/api/discord/users/role/assign", {userId, roleId});
            showToast("Success", "Role assigned to user successfully", "default");
        } catch (error) {
            console.error(error);
            showToast("Error", "An error occurred while assigning a role.", "destructive");
        }
    }, [showToast]);

    const contextValue = useMemo(
        () => ({
            loading,
            discordStat,
            discordStats,
            roles,
            sendJoinRequest,
            updateDiscordStats,
            getDiscordStats,
            addRole,
            addMember,
            addRoleToUser,
            getRoles,
        }),
        [loading, discordStat, discordStats, roles, sendJoinRequest, updateDiscordStats, getDiscordStats, addRole, addMember, addRoleToUser, getRoles]
    );

    return <DiscordContext.Provider value={contextValue}>{children}</DiscordContext.Provider>;
};
