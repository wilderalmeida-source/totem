import { NextResponse } from "next/server";

const API_INTERNA = process.env.LINK_API_INTERNA;
const INTERNAL_TOKEN = process.env.TOKEN_API_INT;

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    const response = await fetch(`${API_INTERNA}/clinux/guiches/${id}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${INTERNAL_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, {
        status: response.status,
    });
}
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!API_INTERNA) {
        return NextResponse.json(
            { error: "LINK_API_INTERNA não configurada" },
            { status: 500 }
        );
    }

    const { id } = await params;

    const response = await fetch(`${API_INTERNA}/clinux/guiches/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${INTERNAL_TOKEN}`,
        },
    });

    const data = await response.json();

    return NextResponse.json(data, {
        status: response.status,
    });
}