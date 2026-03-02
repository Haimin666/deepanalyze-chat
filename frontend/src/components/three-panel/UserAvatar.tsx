"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { Settings, LogOut, User, Shield, Calendar, UserCircle } from "lucide-react";

type UserAvatarProps = {
  onOpenAdmin: () => void;
};

export function UserAvatar({ onOpenAdmin }: UserAvatarProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full p-0"
        >
          <Avatar className="h-7 w-7 cursor-pointer">
            <AvatarFallback className="bg-black text-white dark:bg-white dark:text-black text-xs font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        align="end"
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-black text-white dark:bg-white dark:text-black text-lg font-medium">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-black dark:text-white truncate">
                  {user.name}
                </p>
                <Badge
                  variant={user.role === "admin" ? "default" : "secondary"}
                  className={
                    user.role === "admin"
                      ? "bg-black text-white dark:bg-white dark:text-black text-[10px]"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px]"
                  }
                >
                  {user.role === "admin" ? "管理员" : "用户"}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                @{user.username}
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-200 dark:bg-gray-800" />

        {/* Info */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-3 px-1">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ID: {user.id}
            </span>
          </div>
          <div className="flex items-center gap-3 px-1">
            <UserCircle className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              用户名: {user.username}
            </span>
          </div>
          <div className="flex items-center gap-3 px-1">
            <Shield className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user.role === "admin" ? "管理员权限" : "普通用户权限"}
            </span>
          </div>
          <div className="flex items-center gap-3 px-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              注册于 {formatDate(user.createdAt)}
            </span>
          </div>
        </div>

        <Separator className="bg-gray-200 dark:bg-gray-800" />

        {/* Actions */}
        <div className="p-2">
          {user.role === "admin" && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              onClick={() => {
                setIsOpen(false);
                onOpenAdmin();
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              用户管理
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            退出登录
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
